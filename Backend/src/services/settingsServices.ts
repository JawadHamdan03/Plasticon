import {
  InventoryAuditFrequency,
  ProductType,
} from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

const isValidTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type SnapshotRange = "daily" | "weekly";

type SnapshotInput = {
  machineLabel: string;
  machineCounter: number;
  electricityKwh: number;
  notes?: string;
  machineCounterImage?: string | null;
  electricityImage?: string | null;
};

type SnapshotUpdateInput = Partial<SnapshotInput>;

type SnapshotRow = {
  id: number;
  machine_label: string;
  machine_counter: number;
  electricity_kwh: number;
  notes: string | null;
  machine_counter_image: string | null;
  electricity_image: string | null;
  created_by_id: number | null;
  created_at: Date;
};

type TrendRow = {
  bucket: Date;
  avg_machine_counter: number;
  avg_electricity_kwh: number;
  snapshots_count: number;
};

type ShiftRow = {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
};

const ELECTRICITY_TARIFF_ILS_PER_KWH = 0.68;

const minutesOfDay = (value: Date) =>
  value.getHours() * 60 + value.getMinutes();

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const getShiftWindow = (baseDate: Date, shift: ShiftRow) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(minutesOfDay(shift.startTime));

  const end = new Date(baseDate);
  end.setHours(0, 0, 0, 0);
  end.setMinutes(minutesOfDay(shift.endTime));

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
};

const toDayLabel = (value: Date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(value);

let snapshotsTableInitialized = false;

const toSnapshotDto = (row: SnapshotRow) => ({
  id: row.id,
  machineLabel: row.machine_label,
  machineCounter: Number(row.machine_counter),
  electricityKwh: Number(row.electricity_kwh),
  notes: row.notes,
  machineCounterImage: row.machine_counter_image,
  electricityImage: row.electricity_image,
  createdById: row.created_by_id,
  createdAt: row.created_at,
});

const ensureSnapshotsTable = async () => {
  if (snapshotsTableInitialized) {
    return;
  }

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS operation_snapshots (
      id SERIAL PRIMARY KEY,
      machine_label TEXT NOT NULL,
      machine_counter DOUBLE PRECISION NOT NULL CHECK (machine_counter >= 0),
      electricity_kwh DOUBLE PRECISION NOT NULL CHECK (electricity_kwh >= 0),
      notes TEXT,
      machine_counter_image TEXT,
      electricity_image TEXT,
      created_by_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_operation_snapshots_created_at
    ON operation_snapshots (created_at DESC)
  `;

  snapshotsTableInitialized = true;
};

export const getProductionSettings = async (): Promise<
  ServiceResult<unknown>
> => {
  const settings = await prisma.productionSetting.findMany({
    orderBy: { productType: "asc" },
  });

  return { status: 200, data: settings };
};

export const upsertProductionSetting = async (
  productType: ProductType,
  piecesPerCarton: unknown,
  userId?: number,
): Promise<ServiceResult<unknown>> => {
  if (!Object.values(ProductType).includes(productType)) {
    return { status: 400, message: "Invalid product type" };
  }

  const pieces = Number(piecesPerCarton);
  if (!Number.isFinite(pieces) || pieces <= 0 || !Number.isInteger(pieces)) {
    return {
      status: 400,
      message: "piecesPerCarton must be a positive integer",
    };
  }

  const setting = await prisma.productionSetting.upsert({
    where: { productType },
    update: {
      piecesPerCarton: pieces,
      updatedById: userId ?? null,
    },
    create: {
      productType,
      piecesPerCarton: pieces,
      updatedById: userId ?? null,
    },
  });

  auditAsync(
    userId,
    AuditAction.PRODUCTION_SETTINGS_UPDATED,
    AuditEntityType.PRODUCTION_SETTING,
    setting.id,
    {
      productType,
      piecesPerCarton: pieces,
    },
  );

  return { status: 200, data: setting };
};

export const getSystemSettings = async (): Promise<ServiceResult<unknown>> => {
  const setting = await prisma.systemSetting.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  return { status: 200, data: setting };
};

type SystemSettingsPayload = {
  qualityCheckIntervalMinutes?: number;
  qualityCheckReminderMinutes?: number;
  inventoryAuditFrequency?: InventoryAuditFrequency;
  shiftEndReminderMinutes?: number;
  weeklyReportDayOfWeek?: number;
  weeklyReportTime?: string;
  monthlyReportDayOfMonth?: number;
  monthlyReportTime?: string;
};

export const upsertSystemSettings = async (
  payload: SystemSettingsPayload,
  userId?: number,
): Promise<ServiceResult<unknown>> => {
  const {
    qualityCheckIntervalMinutes,
    qualityCheckReminderMinutes,
    inventoryAuditFrequency,
    shiftEndReminderMinutes,
    weeklyReportDayOfWeek,
    weeklyReportTime,
    monthlyReportDayOfMonth,
    monthlyReportTime,
  } = payload;

  if (
    qualityCheckIntervalMinutes === undefined ||
    qualityCheckReminderMinutes === undefined ||
    inventoryAuditFrequency === undefined ||
    shiftEndReminderMinutes === undefined ||
    weeklyReportDayOfWeek === undefined ||
    weeklyReportTime === undefined ||
    monthlyReportDayOfMonth === undefined ||
    monthlyReportTime === undefined
  ) {
    return { status: 400, message: "All system settings fields are required" };
  }

  if (
    !Object.values(InventoryAuditFrequency).includes(inventoryAuditFrequency)
  ) {
    return { status: 400, message: "Invalid inventory audit frequency" };
  }

  const interval = Number(qualityCheckIntervalMinutes);
  const reminder = Number(qualityCheckReminderMinutes);
  const shiftReminder = Number(shiftEndReminderMinutes);
  const weeklyDay = Number(weeklyReportDayOfWeek);
  const monthlyDay = Number(monthlyReportDayOfMonth);

  if (!Number.isFinite(interval) || interval <= 0) {
    return {
      status: 400,
      message: "qualityCheckIntervalMinutes must be a positive number",
    };
  }

  if (!Number.isFinite(reminder) || reminder < 0) {
    return {
      status: 400,
      message: "qualityCheckReminderMinutes must be zero or a positive number",
    };
  }

  if (!Number.isFinite(shiftReminder) || shiftReminder <= 0) {
    return {
      status: 400,
      message: "shiftEndReminderMinutes must be a positive number",
    };
  }

  if (!Number.isFinite(weeklyDay) || weeklyDay < 1 || weeklyDay > 7) {
    return {
      status: 400,
      message: "weeklyReportDayOfWeek must be between 1 and 7",
    };
  }

  if (!Number.isFinite(monthlyDay) || monthlyDay < 1 || monthlyDay > 31) {
    return {
      status: 400,
      message: "monthlyReportDayOfMonth must be between 1 and 31",
    };
  }

  if (
    !isValidTime(String(weeklyReportTime)) ||
    !isValidTime(String(monthlyReportTime))
  ) {
    return { status: 400, message: "Report times must be in HH:mm format" };
  }

  const existing = await prisma.systemSetting.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const setting = existing
    ? await prisma.systemSetting.update({
        where: { id: existing.id },
        data: {
          qualityCheckIntervalMinutes: interval,
          qualityCheckReminderMinutes: reminder,
          inventoryAuditFrequency,
          shiftEndReminderMinutes: shiftReminder,
          weeklyReportDayOfWeek: weeklyDay,
          weeklyReportTime: String(weeklyReportTime),
          monthlyReportDayOfMonth: monthlyDay,
          monthlyReportTime: String(monthlyReportTime),
          updatedById: userId ?? null,
        },
      })
    : await prisma.systemSetting.create({
        data: {
          qualityCheckIntervalMinutes: interval,
          qualityCheckReminderMinutes: reminder,
          inventoryAuditFrequency,
          shiftEndReminderMinutes: shiftReminder,
          weeklyReportDayOfWeek: weeklyDay,
          weeklyReportTime: String(weeklyReportTime),
          monthlyReportDayOfMonth: monthlyDay,
          monthlyReportTime: String(monthlyReportTime),
          updatedById: userId ?? null,
        },
      });

  auditAsync(
    userId,
    AuditAction.SYSTEM_SETTINGS_UPDATED,
    AuditEntityType.SYSTEM_SETTING,
    setting.id,
    {
      qualityCheckIntervalMinutes: interval,
      qualityCheckReminderMinutes: reminder,
      inventoryAuditFrequency,
      shiftEndReminderMinutes: shiftReminder,
    },
  );

  return { status: 200, data: setting };
};

export const getAdminSettingsOverview = async (): Promise<
  ServiceResult<unknown>
> => {
  const productionSettings = await prisma.productionSetting.findMany({
    include: {
      updatedBy: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: { productType: "asc" },
  });

  const systemSetting = await prisma.systemSetting.findFirst({
    include: {
      updatedBy: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return {
    status: 200,
    data: {
      productionSettingsCount: productionSettings.length,
      hasSystemSetting: Boolean(systemSetting),
      productionSettings,
      latestSystemSetting: systemSetting,
      summary: {
        missingProductTypes: Object.values(ProductType).filter(
          (type) =>
            !productionSettings.some((setting) => setting.productType === type),
        ),
      },
    },
  };
};

export const createSettingsSnapshot = async (
  payload: SnapshotInput,
  userId?: number,
): Promise<ServiceResult<unknown>> => {
  const machineLabel = payload.machineLabel?.trim();
  const machineCounter = Number(payload.machineCounter);
  const electricityKwh = Number(payload.electricityKwh);

  if (!machineLabel) {
    return { status: 400, message: "machineLabel is required" };
  }

  if (!Number.isFinite(machineCounter) || machineCounter < 0) {
    return { status: 400, message: "machineCounter must be a valid number" };
  }

  if (!Number.isFinite(electricityKwh) || electricityKwh < 0) {
    return { status: 400, message: "electricityKwh must be a valid number" };
  }

  await ensureSnapshotsTable();

  const inserted = await prisma.$queryRaw<SnapshotRow[]>`
    INSERT INTO operation_snapshots (
      machine_label,
      machine_counter,
      electricity_kwh,
      notes,
      machine_counter_image,
      electricity_image,
      created_by_id
    )
    VALUES (
      ${machineLabel},
      ${machineCounter},
      ${electricityKwh},
      ${payload.notes?.trim() || null},
      ${payload.machineCounterImage ?? null},
      ${payload.electricityImage ?? null},
      ${userId ?? null}
    )
    RETURNING
      id,
      machine_label,
      machine_counter,
      electricity_kwh,
      notes,
      machine_counter_image,
      electricity_image,
      created_by_id,
      created_at
  `;

  const snapshot = inserted[0];

  auditAsync(
    userId,
    AuditAction.SYSTEM_SETTINGS_UPDATED,
    AuditEntityType.SYSTEM_SETTING,
    snapshot.id,
    {
      snapshotType: "operations",
      machineLabel,
      machineCounter,
      electricityKwh,
    },
  );

  return {
    status: 201,
    data: toSnapshotDto(snapshot),
  };
};

export const updateSettingsSnapshot = async (
  snapshotId: number,
  payload: SnapshotUpdateInput,
  userId?: number,
  isAdmin = false,
): Promise<ServiceResult<unknown>> => {
  if (!Number.isInteger(snapshotId) || snapshotId <= 0) {
    return { status: 400, message: "Invalid snapshot id" };
  }

  await ensureSnapshotsTable();

  const existing = await prisma.$queryRaw<SnapshotRow[]>`
    SELECT
      id,
      machine_label,
      machine_counter,
      electricity_kwh,
      notes,
      machine_counter_image,
      electricity_image,
      created_by_id,
      created_at
    FROM operation_snapshots
    WHERE id = ${snapshotId}
    LIMIT 1
  `;

  const current = existing[0];
  if (!current) {
    return { status: 404, message: "Snapshot not found" };
  }

  if (!isAdmin && current.created_by_id !== userId) {
    return { status: 403, message: "You can only edit your own snapshot" };
  }

  const machineLabel = payload.machineLabel?.trim() || current.machine_label;
  const machineCounter =
    payload.machineCounter !== undefined && payload.machineCounter !== null
      ? Number(payload.machineCounter)
      : Number(current.machine_counter);
  const electricityKwh =
    payload.electricityKwh !== undefined && payload.electricityKwh !== null
      ? Number(payload.electricityKwh)
      : Number(current.electricity_kwh);

  if (!machineLabel) {
    return { status: 400, message: "machineLabel is required" };
  }

  if (!Number.isFinite(machineCounter) || machineCounter < 0) {
    return { status: 400, message: "machineCounter must be a valid number" };
  }

  if (!Number.isFinite(electricityKwh) || electricityKwh < 0) {
    return { status: 400, message: "electricityKwh must be a valid number" };
  }

  const updated = await prisma.$queryRaw<SnapshotRow[]>`
    UPDATE operation_snapshots
    SET
      machine_label = ${machineLabel},
      machine_counter = ${machineCounter},
      electricity_kwh = ${electricityKwh},
      notes = ${payload.notes !== undefined ? payload.notes?.trim() || null : current.notes},
      machine_counter_image = ${payload.machineCounterImage !== undefined ? payload.machineCounterImage : current.machine_counter_image},
      electricity_image = ${payload.electricityImage !== undefined ? payload.electricityImage : current.electricity_image}
    WHERE id = ${snapshotId}
    RETURNING
      id,
      machine_label,
      machine_counter,
      electricity_kwh,
      notes,
      machine_counter_image,
      electricity_image,
      created_by_id,
      created_at
  `;

  const snapshot = updated[0];
  auditAsync(
    userId,
    AuditAction.SYSTEM_SETTINGS_UPDATED,
    AuditEntityType.SYSTEM_SETTING,
    snapshot.id,
    {
      snapshotType: "operations",
      action: "updated",
      machineLabel,
      machineCounter,
      electricityKwh,
    },
  );

  return {
    status: 200,
    data: toSnapshotDto(snapshot),
  };
};

export const deleteSettingsSnapshot = async (
  snapshotId: number,
  userId?: number,
  isAdmin = false,
): Promise<ServiceResult<unknown>> => {
  if (!Number.isInteger(snapshotId) || snapshotId <= 0) {
    return { status: 400, message: "Invalid snapshot id" };
  }

  await ensureSnapshotsTable();

  const existing = await prisma.$queryRaw<SnapshotRow[]>`
    SELECT
      id,
      machine_label,
      machine_counter,
      electricity_kwh,
      notes,
      machine_counter_image,
      electricity_image,
      created_by_id,
      created_at
    FROM operation_snapshots
    WHERE id = ${snapshotId}
    LIMIT 1
  `;

  const current = existing[0];
  if (!current) {
    return { status: 404, message: "Snapshot not found" };
  }

  if (!isAdmin && current.created_by_id !== userId) {
    return { status: 403, message: "You can only delete your own snapshot" };
  }

  await prisma.$executeRaw`
    DELETE FROM operation_snapshots
    WHERE id = ${snapshotId}
  `;

  auditAsync(
    userId,
    AuditAction.SYSTEM_SETTINGS_UPDATED,
    AuditEntityType.SYSTEM_SETTING,
    snapshotId,
    {
      snapshotType: "operations",
      action: "deleted",
      machineLabel: current.machine_label,
    },
  );

  return { status: 200, data: { deleted: true, id: snapshotId } };
};

export const getSettingsSnapshots = async (
  limitRaw: unknown,
  fromRaw?: unknown,
  toRaw?: unknown,
  createdById?: number,
): Promise<ServiceResult<unknown>> => {
  await ensureSnapshotsTable();
  const parsedLimit = Number(limitRaw);
  const limit = Number.isInteger(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 100))
    : 30;

  const fromDate =
    typeof fromRaw === "string" && fromRaw ? new Date(fromRaw) : null;
  const toDate = typeof toRaw === "string" && toRaw ? new Date(toRaw) : null;

  const hasFrom = Boolean(fromDate && !Number.isNaN(fromDate.getTime()));
  const hasTo = Boolean(toDate && !Number.isNaN(toDate.getTime()));
  const hasCreator = Number.isInteger(createdById);

  const snapshots =
    hasCreator && hasFrom && hasTo
      ? await prisma.$queryRaw<SnapshotRow[]>`
        SELECT
          id,
          machine_label,
          machine_counter,
          electricity_kwh,
          notes,
          machine_counter_image,
          electricity_image,
          created_by_id,
          created_at
        FROM operation_snapshots
        WHERE created_by_id = ${createdById as number}
          AND created_at BETWEEN ${fromDate as Date} AND ${toDate as Date}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      : hasCreator && hasFrom
        ? await prisma.$queryRaw<SnapshotRow[]>`
          SELECT
            id,
            machine_label,
            machine_counter,
            electricity_kwh,
            notes,
            machine_counter_image,
            electricity_image,
            created_by_id,
            created_at
          FROM operation_snapshots
          WHERE created_by_id = ${createdById as number}
            AND created_at >= ${fromDate as Date}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
        : hasCreator && hasTo
          ? await prisma.$queryRaw<SnapshotRow[]>`
            SELECT
              id,
              machine_label,
              machine_counter,
              electricity_kwh,
              notes,
              machine_counter_image,
              electricity_image,
              created_by_id,
              created_at
            FROM operation_snapshots
            WHERE created_by_id = ${createdById as number}
              AND created_at <= ${toDate as Date}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
          : hasCreator
            ? await prisma.$queryRaw<SnapshotRow[]>`
              SELECT
                id,
                machine_label,
                machine_counter,
                electricity_kwh,
                notes,
                machine_counter_image,
                electricity_image,
                created_by_id,
                created_at
              FROM operation_snapshots
              WHERE created_by_id = ${createdById as number}
              ORDER BY created_at DESC
              LIMIT ${limit}
            `
            : hasFrom && hasTo
              ? await prisma.$queryRaw<SnapshotRow[]>`
                SELECT
                  id,
                  machine_label,
                  machine_counter,
                  electricity_kwh,
                  notes,
                  machine_counter_image,
                  electricity_image,
                  created_by_id,
                  created_at
                FROM operation_snapshots
                WHERE created_at BETWEEN ${fromDate as Date} AND ${toDate as Date}
                ORDER BY created_at DESC
                LIMIT ${limit}
              `
              : hasFrom
                ? await prisma.$queryRaw<SnapshotRow[]>`
                  SELECT
                    id,
                    machine_label,
                    machine_counter,
                    electricity_kwh,
                    notes,
                    machine_counter_image,
                    electricity_image,
                    created_by_id,
                    created_at
                  FROM operation_snapshots
                  WHERE created_at >= ${fromDate as Date}
                  ORDER BY created_at DESC
                  LIMIT ${limit}
                `
                : hasTo
                  ? await prisma.$queryRaw<SnapshotRow[]>`
                    SELECT
                      id,
                      machine_label,
                      machine_counter,
                      electricity_kwh,
                      notes,
                      machine_counter_image,
                      electricity_image,
                      created_by_id,
                      created_at
                    FROM operation_snapshots
                    WHERE created_at <= ${toDate as Date}
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                  `
                  : await prisma.$queryRaw<SnapshotRow[]>`
                    SELECT
                      id,
                      machine_label,
                      machine_counter,
                      electricity_kwh,
                      notes,
                      machine_counter_image,
                      electricity_image,
                      created_by_id,
                      created_at
                    FROM operation_snapshots
                    ORDER BY created_at DESC
                    LIMIT ${limit}
                  `;

  // Enrich with creator names in a single follow-up query
  const creatorIds = [
    ...new Set(
      snapshots
        .filter((s) => s.created_by_id != null)
        .map((s) => s.created_by_id as number),
    ),
  ];
  const creators =
    creatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const creatorMap = new Map(creators.map((c) => [c.id, c.fullName]));

  return {
    status: 200,
    data: snapshots.map((row) => ({
      ...toSnapshotDto(row),
      createdByName: row.created_by_id
        ? (creatorMap.get(row.created_by_id) ?? null)
        : null,
    })),
  };
};

export const getSettingsSnapshotTrend = async (
  rangeRaw: unknown,
  limitRaw: unknown,
  fromRaw?: unknown,
  toRaw?: unknown,
): Promise<ServiceResult<unknown>> => {
  await ensureSnapshotsTable();

  const range: SnapshotRange =
    rangeRaw === "weekly" || rangeRaw === "daily" ? rangeRaw : "daily";

  const parsedLimit = Number(limitRaw);
  const limit = Number.isInteger(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 52))
    : range === "weekly"
      ? 12
      : 14;

  const bucket = range === "weekly" ? "week" : "day";

  const fromDate =
    typeof fromRaw === "string" && fromRaw ? new Date(fromRaw) : null;
  const toDate = typeof toRaw === "string" && toRaw ? new Date(toRaw) : null;

  const hasFrom = Boolean(fromDate && !Number.isNaN(fromDate.getTime()));
  const hasTo = Boolean(toDate && !Number.isNaN(toDate.getTime()));

  const whereClause =
    hasFrom && hasTo
      ? "WHERE created_at BETWEEN $2 AND $3"
      : hasFrom
        ? "WHERE created_at >= $2"
        : hasTo
          ? "WHERE created_at <= $2"
          : "";

  const rows = await prisma.$queryRawUnsafe<TrendRow[]>(
    `
      SELECT
        date_trunc('${bucket}', created_at) AS bucket,
        AVG(machine_counter) AS avg_machine_counter,
        AVG(electricity_kwh) AS avg_electricity_kwh,
        COUNT(*)::int AS snapshots_count
      FROM operation_snapshots
      ${whereClause}
      GROUP BY date_trunc('${bucket}', created_at)
      ORDER BY bucket DESC
      LIMIT $1
    `,
    ...(hasFrom && hasTo
      ? [limit, fromDate as Date, toDate as Date]
      : hasFrom
        ? [limit, fromDate as Date]
        : hasTo
          ? [limit, toDate as Date]
          : [limit]),
  );

  return {
    status: 200,
    data: rows
      .map((row) => ({
        bucket: row.bucket,
        avgMachineCounter: Number(row.avg_machine_counter),
        avgElectricityKwh: Number(row.avg_electricity_kwh),
        snapshotsCount: Number(row.snapshots_count),
      }))
      .reverse(),
  };
};

export const getElectricityShiftConsumptionReport = async (
  fromDateRaw?: unknown,
  toDateRaw?: unknown,
): Promise<ServiceResult<unknown>> => {
  await ensureSnapshotsTable();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const defaultFrom = new Date(todayStart);
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const fromDate =
    typeof fromDateRaw === "string" && fromDateRaw
      ? new Date(`${fromDateRaw}T00:00:00.000`)
      : defaultFrom;
  const toDate =
    typeof toDateRaw === "string" && toDateRaw
      ? new Date(`${toDateRaw}T23:59:59.999`)
      : new Date(now);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { status: 400, message: "Invalid fromDate or toDate" };
  }

  if (toDate < fromDate) {
    return { status: 400, message: "toDate must be after fromDate" };
  }

  const shifts = await prisma.shift.findMany({
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: "asc" },
  });

  if (!shifts.length) {
    return {
      status: 200,
      data: {
        tariffPerKwh: ELECTRICITY_TARIFF_ILS_PER_KWH,
        range: {
          fromDate: toDateKey(fromDate),
          toDate: toDateKey(toDate),
        },
        shifts: [],
        days: [],
        summary: {
          totalConsumedKwh: 0,
          totalCostIls: 0,
          totalShiftRows: 0,
          missingReadings: 0,
        },
      },
    };
  }

  const snapshots = await prisma.$queryRaw<
    Array<{
      electricity_kwh: number;
      created_at: Date;
    }>
  >`
    SELECT electricity_kwh, created_at
    FROM operation_snapshots
    WHERE created_at >= ${fromDate} AND created_at <= ${toDate}
    ORDER BY created_at ASC
  `;

  const previousSnapshot = await prisma.$queryRaw<
    Array<{ electricity_kwh: number }>
  >`
    SELECT electricity_kwh
    FROM operation_snapshots
    WHERE created_at < ${fromDate}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  let previousMeterReading = previousSnapshot.length
    ? Number(previousSnapshot[0].electricity_kwh)
    : null;

  const rows: Array<{
    date: string;
    day: string;
    shiftId: number;
    shiftName: string;
    meterReadingKwh: number | null;
    consumedKwh: number | null;
    costIls: number | null;
    recordedAt: string | null;
  }> = [];

  const dailySummary = new Map<
    string,
    {
      date: string;
      day: string;
      totalConsumedKwh: number;
      totalCostIls: number;
      recordedShiftCount: number;
      missingShiftCount: number;
    }
  >();

  const shiftsByStart = [...shifts].sort(
    (a, b) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime),
  );

  const dayCursor = new Date(fromDate);
  dayCursor.setHours(0, 0, 0, 0);

  const dayEnd = new Date(toDate);
  dayEnd.setHours(0, 0, 0, 0);

  while (dayCursor <= dayEnd) {
    for (const shift of shiftsByStart) {
      const window = getShiftWindow(dayCursor, shift);

      if (window.end <= fromDate || window.start > toDate) {
        continue;
      }

      const inShift = snapshots.filter(
        (item) =>
          item.created_at >= window.start && item.created_at < window.end,
      );
      const latestInShift = inShift.length ? inShift[inShift.length - 1] : null;

      const meterReadingKwh = latestInShift
        ? Number(latestInShift.electricity_kwh)
        : null;
      const consumedKwh =
        meterReadingKwh !== null && previousMeterReading !== null
          ? Math.max(0, meterReadingKwh - previousMeterReading)
          : null;
      const costIls =
        consumedKwh === null
          ? null
          : consumedKwh * ELECTRICITY_TARIFF_ILS_PER_KWH;

      if (meterReadingKwh !== null) {
        previousMeterReading = meterReadingKwh;
      }

      const dateKey = toDateKey(dayCursor);
      const dayBucket = dailySummary.get(dateKey) ?? {
        date: dateKey,
        day: toDayLabel(dayCursor),
        totalConsumedKwh: 0,
        totalCostIls: 0,
        recordedShiftCount: 0,
        missingShiftCount: 0,
      };

      if (consumedKwh === null) {
        dayBucket.missingShiftCount += 1;
      } else {
        dayBucket.recordedShiftCount += 1;
        dayBucket.totalConsumedKwh += consumedKwh;
        dayBucket.totalCostIls += costIls ?? 0;
      }

      dailySummary.set(dateKey, dayBucket);

      rows.push({
        date: dateKey,
        day: toDayLabel(dayCursor),
        shiftId: shift.id,
        shiftName: shift.name,
        meterReadingKwh,
        consumedKwh,
        costIls,
        recordedAt: latestInShift
          ? latestInShift.created_at.toISOString()
          : null,
      });
    }

    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  const dayRows = Array.from(dailySummary.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const totalConsumedKwh = dayRows.reduce(
    (sum, item) => sum + item.totalConsumedKwh,
    0,
  );
  const totalCostIls = dayRows.reduce(
    (sum, item) => sum + item.totalCostIls,
    0,
  );

  return {
    status: 200,
    data: {
      tariffPerKwh: ELECTRICITY_TARIFF_ILS_PER_KWH,
      range: {
        fromDate: toDateKey(fromDate),
        toDate: toDateKey(toDate),
      },
      shifts: rows.sort((a, b) =>
        a.date === b.date
          ? a.shiftId - b.shiftId
          : a.date.localeCompare(b.date),
      ),
      days: dayRows,
      summary: {
        totalConsumedKwh,
        totalCostIls,
        totalShiftRows: rows.length,
        missingReadings: rows.filter((item) => item.consumedKwh === null)
          .length,
      },
    },
  };
};
