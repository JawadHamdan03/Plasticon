import { prisma } from "../config/lib/prisma";
import { NotificationType, UserRole } from "../config/generated/prisma/client";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type StopPriority = "CRITICAL" | "HIGH" | "NORMAL";
type ShiftPhase = "START" | "END";

let workerFeaturesReady = false;

type KaizenReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

const toIsoDate = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const asText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const ensureWorkerFeaturesTables = async () => {
  if (workerFeaturesReady) {
    return;
  }

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_machine_stop_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      machine_label TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('CRITICAL','HIGH','NORMAL')),
      reason TEXT NOT NULL,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP,
      response_minutes DOUBLE PRECISION,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_shift_checklists (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      shift_phase TEXT NOT NULL CHECK (shift_phase IN ('START','END')),
      tasks_json JSONB NOT NULL,
      digital_signature TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_material_waste_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      machine_label TEXT NOT NULL,
      machine_type TEXT,
      material_type TEXT NOT NULL,
      waste_kg DOUBLE PRECISION NOT NULL CHECK (waste_kg >= 0),
      reason TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_daily_targets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      target_date DATE NOT NULL,
      target_units DOUBLE PRECISION NOT NULL CHECK (target_units >= 0),
      actual_units DOUBLE PRECISION NOT NULL CHECK (actual_units >= 0),
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_kaizen_suggestions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      details TEXT NOT NULL,
      estimated_impact TEXT,
      review_status TEXT NOT NULL DEFAULT 'PENDING',
      review_note TEXT,
      reviewed_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      score INTEGER NOT NULL DEFAULT 0,
      reward_points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    ALTER TABLE worker_kaizen_suggestions
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'PENDING'
  `;
  await prisma.$executeRaw`
    ALTER TABLE worker_kaizen_suggestions
    ADD COLUMN IF NOT EXISTS review_note TEXT
  `;
  await prisma.$executeRaw`
    ALTER TABLE worker_kaizen_suggestions
    ADD COLUMN IF NOT EXISTS reviewed_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL
  `;
  await prisma.$executeRaw`
    ALTER TABLE worker_kaizen_suggestions
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_quality_issue_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      batch_code TEXT NOT NULL,
      machine_label TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      details TEXT,
      issue_image TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_micro_stops (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      machine_label TEXT NOT NULL,
      reason TEXT NOT NULL,
      duration_minutes DOUBLE PRECISION NOT NULL CHECK (duration_minutes >= 0),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS worker_electricity_anomaly_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      machine_label TEXT NOT NULL,
      current_kwh DOUBLE PRECISION NOT NULL CHECK (current_kwh >= 0),
      baseline_kwh DOUBLE PRECISION NOT NULL CHECK (baseline_kwh >= 0),
      threshold_ratio DOUBLE PRECISION NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  workerFeaturesReady = true;
};

const pushNotificationToUsers = async (
  userIds: number[],
  title: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM_MESSAGE,
  machineId?: number,
) => {
  if (!userIds.length) {
    return;
  }

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      machineId: machineId ?? null,
    })),
  });

  userIds.forEach((userId) => {
    emitNotificationToUser(userId, {
      title,
      message,
      type,
      machineId: machineId ?? null,
      createdAt: new Date().toISOString(),
    });
    emitNotificationUnreadCountUpdate(userId, { refresh: true });
  });
};

const notifyAdmins = async (
  title: string,
  message: string,
  type: NotificationType = NotificationType.SYSTEM_MESSAGE,
) => {
  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: { id: true },
  });

  await pushNotificationToUsers(
    admins.map((admin) => admin.id),
    title,
    message,
    type,
  );
};

export const createMachineStopAlert = async (
  userId: number,
  payload: { machineLabel?: unknown; priority?: unknown; reason?: unknown },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const machineLabel = asText(payload.machineLabel);
  const reason = asText(payload.reason);
  const priority = String(
    payload.priority || "NORMAL",
  ).toUpperCase() as StopPriority;

  if (!machineLabel || !reason) {
    return { status: 400, message: "machineLabel and reason are required" };
  }

  if (!["CRITICAL", "HIGH", "NORMAL"].includes(priority)) {
    return {
      status: 400,
      message: "priority must be CRITICAL, HIGH, or NORMAL",
    };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_machine_stop_alerts (user_id, machine_label, priority, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING id, machine_label, priority, reason, started_at, created_at`,
    userId,
    machineLabel,
    priority,
    reason,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Machine Stop Alert",
    `Worker #${userId} reported ${priority} stop on ${machineLabel}: ${reason}`,
    NotificationType.MAINTENANCE_URGENT,
  );

  return { status: 201, data: rows[0] };
};

export const getMyMachineStopAlerts = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, machine_label, priority, reason, started_at, resolved_at, response_minutes, created_at
     FROM worker_machine_stop_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;
  return { status: 200, data: rows } as ServiceResult<unknown>;
};

export const resolveMachineStopAlert = async (
  userId: number,
  alertId: number,
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  if (!Number.isInteger(alertId) || alertId <= 0) {
    return { status: 400, message: "Invalid alert id" };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `UPDATE worker_machine_stop_alerts
     SET resolved_at = NOW(),
         response_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60.0
     WHERE id = $1 AND user_id = $2
     RETURNING id, machine_label, priority, reason, started_at, resolved_at, response_minutes, created_at`,
    alertId,
    userId,
  )) as Array<Record<string, unknown>>;

  if (!rows.length) {
    return { status: 404, message: "Stop alert not found" };
  }

  return { status: 200, data: rows[0] };
};

export const saveShiftChecklist = async (
  userId: number,
  payload: {
    shiftPhase?: unknown;
    tasks?: unknown;
    digitalSignature?: unknown;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const phase = String(
    payload.shiftPhase || "START",
  ).toUpperCase() as ShiftPhase;
  const signature = asText(payload.digitalSignature);
  const tasks = Array.isArray(payload.tasks)
    ? payload.tasks
        .map((item) => ({
          label: asText((item as Record<string, unknown>)?.label),
          done: Boolean((item as Record<string, unknown>)?.done),
        }))
        .filter((item) => item.label)
    : [];

  if (!["START", "END"].includes(phase)) {
    return { status: 400, message: "shiftPhase must be START or END" };
  }

  if (!tasks.length || !signature) {
    return { status: 400, message: "tasks and digitalSignature are required" };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_shift_checklists (user_id, shift_phase, tasks_json, digital_signature)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING id, shift_phase, tasks_json, digital_signature, created_at`,
    userId,
    phase,
    JSON.stringify(tasks),
    signature,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Shift Checklist Submitted",
    `Worker #${userId} submitted ${phase} checklist with digital signature.`,
    NotificationType.SYSTEM_MESSAGE,
  );

  return { status: 201, data: rows[0] };
};

export const getMyShiftChecklists = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, shift_phase, tasks_json, digital_signature, created_at
     FROM worker_shift_checklists WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;
  return { status: 200, data: rows } as ServiceResult<unknown>;
};

export const createMaterialWasteLog = async (
  userId: number,
  payload: {
    machineLabel?: unknown;
    machineType?: unknown;
    materialType?: unknown;
    wasteKg?: unknown;
    reason?: unknown;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const machineLabel = asText(payload.machineLabel);
  const machineType = asText(payload.machineType);
  const materialType = asText(payload.materialType);
  const reason = asText(payload.reason);
  const wasteKg = asNumber(payload.wasteKg);

  if (
    !machineLabel ||
    !materialType ||
    !reason ||
    Number.isNaN(wasteKg) ||
    wasteKg < 0
  ) {
    return {
      status: 400,
      message: "machineLabel, materialType, reason, wasteKg are required",
    };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_material_waste_logs (user_id, machine_label, machine_type, material_type, waste_kg, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, machine_label, machine_type, material_type, waste_kg, reason, created_at`,
    userId,
    machineLabel,
    machineType || null,
    materialType,
    wasteKg,
    reason,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Material Waste Logged",
    `Worker #${userId} logged waste ${wasteKg.toFixed(2)}kg on ${machineLabel}.`,
    NotificationType.SYSTEM_MESSAGE,
  );

  return { status: 201, data: rows[0] };
};

export const getMyMaterialWasteLogs = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, machine_label, machine_type, material_type, waste_kg, reason, created_at
     FROM worker_material_waste_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;
  return { status: 200, data: rows } as ServiceResult<unknown>;
};

export const saveDailyTargetProgress = async (
  userId: number,
  payload: {
    targetDate?: unknown;
    targetUnits?: unknown;
    actualUnits?: unknown;
    note?: unknown;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const targetDate =
    asText(payload.targetDate) || new Date().toISOString().slice(0, 10);
  const targetUnits = asNumber(payload.targetUnits);
  const actualUnits = asNumber(payload.actualUnits);
  const note = asText(payload.note);

  if (
    Number.isNaN(targetUnits) ||
    Number.isNaN(actualUnits) ||
    targetUnits < 0 ||
    actualUnits < 0
  ) {
    return {
      status: 400,
      message: "targetUnits and actualUnits must be valid numbers",
    };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_daily_targets (user_id, target_date, target_units, actual_units, note)
     VALUES ($1, $2::date, $3, $4, $5)
     RETURNING id, target_date, target_units, actual_units, note, created_at`,
    userId,
    targetDate,
    targetUnits,
    actualUnits,
    note || null,
  )) as Array<Record<string, unknown>>;

  const record = rows[0];
  const achieved =
    Number(record.actual_units ?? actualUnits) >=
    Number(record.target_units ?? targetUnits);

  const result = {
    status: 201,
    data: {
      ...record,
      achieved,
      achievementRatio:
        Number(record.target_units ?? targetUnits) > 0
          ? Number(record.actual_units ?? actualUnits) /
            Number(record.target_units ?? targetUnits)
          : 0,
      alert: achieved
        ? "Target achieved. Great job."
        : "Target not achieved yet. Keep pushing.",
    },
  };

  if (!achieved) {
    await notifyAdmins(
      "Daily Target Missed",
      `Worker #${userId} has not achieved daily target yet (${actualUnits}/${targetUnits}).`,
      NotificationType.PRODUCTION_ALERT,
    );
  }

  return result;
};

export const getMyDailyTargets = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, target_date, target_units, actual_units, note, created_at
     FROM worker_daily_targets WHERE user_id = $1 ORDER BY target_date DESC, created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;

  return {
    status: 200,
    data: rows.map((row) => {
      const target = Number(row.target_units ?? 0);
      const actual = Number(row.actual_units ?? 0);
      return {
        ...row,
        target_date: toIsoDate(row.target_date as Date | string),
        achieved: target > 0 ? actual >= target : false,
        achievementRatio: target > 0 ? actual / target : 0,
      };
    }),
  } as ServiceResult<unknown>;
};

export const createKaizenSuggestion = async (
  userId: number,
  payload: { title?: unknown; details?: unknown; estimatedImpact?: unknown },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const title = asText(payload.title);
  const details = asText(payload.details);
  const estimatedImpact = asText(payload.estimatedImpact);

  if (!title || !details) {
    return { status: 400, message: "title and details are required" };
  }

  const rewardPoints = Math.max(
    5,
    Math.min(30, Math.round(details.length / 20)),
  );
  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_kaizen_suggestions (user_id, title, details, estimated_impact, review_status, score, reward_points)
     VALUES ($1, $2, $3, $4, 'PENDING', 0, $5)
     RETURNING id, title, details, estimated_impact, review_status, score, reward_points, created_at`,
    userId,
    title,
    details,
    estimatedImpact || null,
    rewardPoints,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Kaizen Suggestion Submitted",
    `Worker #${userId} submitted kaizen suggestion: ${title}`,
    NotificationType.SYSTEM_MESSAGE,
  );

  return { status: 201, data: rows[0] };
};

export const getMyKaizenSuggestions = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, title, details, estimated_impact, review_status, review_note, reviewed_by_id, reviewed_at, score, reward_points, created_at
     FROM worker_kaizen_suggestions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;
  return { status: 200, data: rows } as ServiceResult<unknown>;
};

export const getAdminKaizenSuggestions = async (
  reviewStatus?: string,
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const status = reviewStatus ? String(reviewStatus).toUpperCase() : "";
  const hasFilter = ["PENDING", "APPROVED", "REJECTED"].includes(status);

  const rows = hasFilter
    ? ((await prisma.$queryRawUnsafe(
        `SELECT k.id, k.user_id, u.fullName AS worker_name, k.title, k.details, k.estimated_impact,
                k.review_status, k.review_note, k.reviewed_by_id, k.reviewed_at,
                k.score, k.reward_points, k.created_at
         FROM worker_kaizen_suggestions k
         JOIN "User" u ON u.id = k.user_id
         WHERE k.review_status = $1
         ORDER BY k.created_at DESC`,
        status,
      )) as Array<Record<string, unknown>>)
    : ((await prisma.$queryRawUnsafe(
        `SELECT k.id, k.user_id, u.fullName AS worker_name, k.title, k.details, k.estimated_impact,
                k.review_status, k.review_note, k.reviewed_by_id, k.reviewed_at,
                k.score, k.reward_points, k.created_at
         FROM worker_kaizen_suggestions k
         JOIN "User" u ON u.id = k.user_id
         ORDER BY k.created_at DESC`,
      )) as Array<Record<string, unknown>>);

  return { status: 200, data: rows };
};

export const reviewKaizenSuggestion = async (
  adminUserId: number,
  suggestionId: number,
  payload: {
    reviewStatus?: unknown;
    score?: unknown;
    rewardPoints?: unknown;
    reviewNote?: unknown;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const reviewStatus = String(
    payload.reviewStatus || "",
  ).toUpperCase() as KaizenReviewStatus;
  const score = asNumber(payload.score);
  const rewardPoints = asNumber(payload.rewardPoints);
  const reviewNote = asText(payload.reviewNote);

  if (!["APPROVED", "REJECTED"].includes(reviewStatus)) {
    return {
      status: 400,
      message: "reviewStatus must be APPROVED or REJECTED",
    };
  }

  const normalizedScore = Number.isNaN(score)
    ? 0
    : Math.max(0, Math.min(100, score));
  const normalizedPoints = Number.isNaN(rewardPoints)
    ? reviewStatus === "APPROVED"
      ? 20
      : 0
    : Math.max(0, rewardPoints);

  const rows = (await prisma.$queryRawUnsafe(
    `UPDATE worker_kaizen_suggestions
     SET review_status = $1,
         score = $2,
         reward_points = $3,
         review_note = $4,
         reviewed_by_id = $5,
         reviewed_at = NOW()
     WHERE id = $6
     RETURNING id, user_id, title, review_status, score, reward_points, review_note, reviewed_by_id, reviewed_at, created_at`,
    reviewStatus,
    normalizedScore,
    normalizedPoints,
    reviewNote || null,
    adminUserId,
    suggestionId,
  )) as Array<Record<string, unknown>>;

  if (!rows.length) {
    return { status: 404, message: "Kaizen suggestion not found" };
  }

  const reviewed = rows[0];
  const workerUserId = Number(reviewed.user_id);

  await pushNotificationToUsers(
    [workerUserId],
    "Kaizen Suggestion Reviewed",
    `Your kaizen suggestion '${String(reviewed.title)}' has been ${String(reviewed.review_status)}.`,
    NotificationType.SYSTEM_MESSAGE,
  );

  return { status: 200, data: reviewed };
};

export const createQualityIssueReport = async (
  userId: number,
  payload: {
    batchCode?: unknown;
    machineLabel?: unknown;
    issueType?: unknown;
    details?: unknown;
    issueImage?: string | null;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const batchCode = asText(payload.batchCode);
  const machineLabel = asText(payload.machineLabel);
  const issueType = asText(payload.issueType);
  const details = asText(payload.details);

  if (!batchCode || !machineLabel || !issueType) {
    return {
      status: 400,
      message: "batchCode, machineLabel and issueType are required",
    };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_quality_issue_reports (user_id, batch_code, machine_label, issue_type, details, issue_image)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, batch_code, machine_label, issue_type, details, issue_image, created_at`,
    userId,
    batchCode,
    machineLabel,
    issueType,
    details || null,
    payload.issueImage || null,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Quality Issue Reported",
    `Worker #${userId} reported quality issue on batch ${batchCode} (${machineLabel}).`,
    NotificationType.QUALITY_ISSUE,
  );

  return { status: 201, data: rows[0] };
};

export const getMyQualityIssueReports = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, batch_code, machine_label, issue_type, details, issue_image, created_at
     FROM worker_quality_issue_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;
  return { status: 200, data: rows } as ServiceResult<unknown>;
};

export const createMicroStop = async (
  userId: number,
  payload: {
    machineLabel?: unknown;
    reason?: unknown;
    durationMinutes?: unknown;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const machineLabel = asText(payload.machineLabel);
  const reason = asText(payload.reason);
  const durationMinutes = asNumber(payload.durationMinutes);

  if (
    !machineLabel ||
    !reason ||
    Number.isNaN(durationMinutes) ||
    durationMinutes < 0
  ) {
    return {
      status: 400,
      message: "machineLabel, reason, durationMinutes are required",
    };
  }

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_micro_stops (user_id, machine_label, reason, duration_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, machine_label, reason, duration_minutes, created_at`,
    userId,
    machineLabel,
    reason,
    durationMinutes,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Micro-stop Logged",
    `Worker #${userId} logged micro-stop (${durationMinutes.toFixed(1)} min) on ${machineLabel}.`,
    NotificationType.MAINTENANCE_URGENT,
  );

  return { status: 201, data: rows[0] };
};

export const getMyMicroStops = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, machine_label, reason, duration_minutes, created_at
     FROM worker_micro_stops WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;
  return { status: 200, data: rows } as ServiceResult<unknown>;
};

export const createElectricityAnomalyAlert = async (
  userId: number,
  payload: {
    machineLabel?: unknown;
    currentKwh?: unknown;
    thresholdRatio?: unknown;
  },
): Promise<ServiceResult<unknown>> => {
  await ensureWorkerFeaturesTables();

  const machineLabel = asText(payload.machineLabel);
  const currentKwh = asNumber(payload.currentKwh);
  const thresholdRatio = Number.isFinite(asNumber(payload.thresholdRatio))
    ? Math.max(1.05, asNumber(payload.thresholdRatio))
    : 1.3;

  if (!machineLabel || Number.isNaN(currentKwh) || currentKwh < 0) {
    return { status: 400, message: "machineLabel and currentKwh are required" };
  }

  const baselineRows = (await prisma.$queryRawUnsafe(
    `SELECT COALESCE(AVG(electricity_kwh), 0) AS baseline
     FROM operation_snapshots
     WHERE created_by_id = $1 AND machine_label = $2`,
    userId,
    machineLabel,
  )) as Array<{ baseline: number | null }>;

  const baseline = Number(baselineRows[0]?.baseline ?? 0);
  const hasBaseline = baseline > 0;
  const ratio = hasBaseline ? currentKwh / baseline : 1;
  const shouldAlert = !hasBaseline ? false : ratio >= thresholdRatio;

  if (!shouldAlert) {
    return {
      status: 200,
      data: {
        alerted: false,
        baselineKwh: baseline,
        currentKwh,
        ratio,
        message: "Usage is within normal range.",
      },
    };
  }

  const severity = ratio >= thresholdRatio * 1.25 ? "CRITICAL" : "HIGH";
  const message = `Electricity usage is abnormal for ${machineLabel}: current ${currentKwh.toFixed(2)} kWh vs baseline ${baseline.toFixed(2)} kWh`;

  const rows = (await prisma.$queryRawUnsafe(
    `INSERT INTO worker_electricity_anomaly_alerts
      (user_id, machine_label, current_kwh, baseline_kwh, threshold_ratio, severity, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, machine_label, current_kwh, baseline_kwh, threshold_ratio, severity, message, created_at`,
    userId,
    machineLabel,
    currentKwh,
    baseline,
    thresholdRatio,
    severity,
    message,
  )) as Array<Record<string, unknown>>;

  await notifyAdmins(
    "Electricity Anomaly Alert",
    message,
    NotificationType.PRODUCTION_ALERT,
  );

  return { status: 201, data: { alerted: true, ...rows[0] } };
};

export const getMyElectricityAnomalyAlerts = async (userId: number) => {
  await ensureWorkerFeaturesTables();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT id, machine_label, current_kwh, baseline_kwh, threshold_ratio, severity, message, created_at
     FROM worker_electricity_anomaly_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    userId,
  )) as Array<Record<string, unknown>>;

  return { status: 200, data: rows } as ServiceResult<unknown>;
};
