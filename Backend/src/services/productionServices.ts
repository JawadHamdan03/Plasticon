import {
  InventoryType,
  NotificationType,
  ProductType,
  ReferenceType,
} from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
import { dispatchAutoNotification } from "./notificationServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type BoxEntry = {
  cavities: number;
  cycles: number;
  numberOfBoxes: number;
};

type CreateProductionPayload = {
  machineId?: number;
  shiftId?: number;
  hourSlot?: string;
  cartonsCount?: number;
  workingCavities?: number;
  boxes?: BoxEntry[] | string;
  rawHdpeUsed?: number;
  rawLdpeUsed?: number;
  rawPetUsed?: number;
  adhesiveUsed?: number;
  emptyBagsUsed?: number;
  colorUsed?: number;
  downtimeReason?: string;
  downtimeMinutes?: number;
  notes?: string;
  documentPath?: string;
  damagedPieces?: number;
  capColor?: string;
  preformType?: string;
  date?: string;
};

type MaterialUsageEntry = {
  field: string;
  quantity: number;
};

type DateRangeFilter = {
  fromDate?: string;
  toDate?: string;
};

type InventoryDailyDeductionRow = {
  date: string;
  hdpe: number;
  ldpe: number;
  pet: number;
  adhesive: number;
  emptyBags: number;
  color: number;
  other: number;
  totalRawUsed: number;
};

const MATERIAL_ALIASES: Record<string, string[]> = {
  rawHdpeUsed: [
    "HDPE",
    "HIGH DENSITY POLYETHYLENE",
    "بولي ايثيلين عالي الكثافة",
    "بولي ايثيلين عالي",
    "بولي ايثيلين",
  ],
  rawLdpeUsed: [
    "LDPE",
    "LOW DENSITY POLYETHYLENE",
    "بولي ايثيلين منخفض الكثافة",
    "بولي ايثيلين منخفض",
  ],
  rawPetUsed: ["PET", "PREFORM", "بولي ايثيلين تيرفثالات", "بريفورم"],
  adhesiveUsed: ["ADHESIVE", "GLUE", "لاصق", "غراء"],
  emptyBagsUsed: ["EMPTY_BAGS", "EMPTY BAGS", "BAGS", "أكياس فارغة", "اكياس"],
  colorUsed: [
    "COLOR",
    "COLORANT",
    "MASTERBATCH",
    "COLOR MASTERBATCH",
    "ملون",
    "ماستر باتش",
  ],
};

const normalizeMaterialName = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();

const getUsageAliases = (field: string) => MATERIAL_ALIASES[field] ?? [];

const classifyMaterialByName = (
  materialName: string,
): keyof Omit<InventoryDailyDeductionRow, "date" | "totalRawUsed"> => {
  const normalized = normalizeMaterialName(materialName);

  for (const [field, aliases] of Object.entries(MATERIAL_ALIASES)) {
    const found = aliases.some((alias) => {
      const normalizedAlias = normalizeMaterialName(alias);
      return (
        normalized === normalizedAlias ||
        normalized.includes(normalizedAlias) ||
        normalizedAlias.includes(normalized)
      );
    });

    if (found) {
      if (field === "rawHdpeUsed") return "hdpe";
      if (field === "rawLdpeUsed") return "ldpe";
      if (field === "rawPetUsed") return "pet";
      if (field === "adhesiveUsed") return "adhesive";
      if (field === "emptyBagsUsed") return "emptyBags";
      if (field === "colorUsed") return "color";
    }
  }

  return "other";
};

const buildCreatedAtFilter = (range: DateRangeFilter) => {
  const createdAt: { gte?: Date; lte?: Date } = {};

  if (range.fromDate) {
    const from = new Date(`${range.fromDate}T00:00:00.000Z`);
    if (!Number.isNaN(from.getTime())) {
      createdAt.gte = from;
    }
  }

  if (range.toDate) {
    const to = new Date(`${range.toDate}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) {
      createdAt.lte = to;
    }
  }

  return Object.keys(createdAt).length ? createdAt : undefined;
};

const COUNTER_REMINDER_TITLE = "Shift Counter Reminder";

const minutesOfDay = (value: Date) =>
  value.getHours() * 60 + value.getMinutes();

const getShiftWindow = (baseDate: Date, startTime: Date, endTime: Date) => {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(minutesOfDay(startTime));

  const end = new Date(baseDate);
  end.setHours(0, 0, 0, 0);
  end.setMinutes(minutesOfDay(endTime));

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
};

const ensureOperationSnapshotsTableForReminder = async () => {
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
};

const sendShiftCounterReminderIfNeeded = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      shiftId: true,
      shift: {
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!user?.shiftId || !user.shift) {
    return;
  }

  const now = new Date();
  const shiftWindow = getShiftWindow(
    now,
    user.shift.startTime,
    user.shift.endTime,
  );

  if (now < shiftWindow.start || now >= shiftWindow.end) {
    return;
  }

  await ensureOperationSnapshotsTableForReminder();

  const alreadyRecorded = await prisma.$queryRaw<
    Array<{ count: bigint | number }>
  >`
    SELECT COUNT(*)::bigint AS count
    FROM operation_snapshots
    WHERE created_by_id = ${userId}
      AND created_at >= ${shiftWindow.start}
      AND created_at < ${shiftWindow.end}
  `;

  const recordsCount = Number(alreadyRecorded[0]?.count ?? 0);
  if (recordsCount > 0) {
    return;
  }

  const existingReminder = await prisma.notification.findFirst({
    where: {
      userId,
      title: COUNTER_REMINDER_TITLE,
      type: NotificationType.SYSTEM_MESSAGE,
      createdAt: {
        gte: shiftWindow.start,
        lt: shiftWindow.end,
      },
    },
    select: { id: true },
  });

  if (existingReminder) {
    return;
  }

  const reminder = await prisma.notification.create({
    data: {
      userId,
      title: COUNTER_REMINDER_TITLE,
      message: `يرجى تسجيل عداد الماكينة وعداد الكهرباء المشترك للشفت ${user.shift.name}. Please record machine and shared electricity counters for shift ${user.shift.name}.`,
      type: NotificationType.SYSTEM_MESSAGE,
    },
  });

  emitNotificationToUser(userId, reminder);
  emitNotificationUnreadCountUpdate(userId, { refresh: true });
};

const getProductTypeFromMachineType = (
  machineType: string,
): ProductType | null => {
  const normalized = machineType.trim().toUpperCase();

  if (normalized === ProductType.CAPS || normalized.includes("CAP")) {
    return ProductType.CAPS;
  }

  if (
    normalized === ProductType.PREFORM ||
    normalized.includes("PREFORM") ||
    normalized.includes("PET")
  ) {
    return ProductType.PREFORM;
  }

  return null;
};

const asNonNegativeNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const generateHourSlot = (): string => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

const getMaterialUsageEntries = (payload: CreateProductionPayload) => {
  const rawHdpeUsed = asNonNegativeNumber(payload.rawHdpeUsed);
  const rawLdpeUsed = asNonNegativeNumber(payload.rawLdpeUsed);
  const rawPetUsed = asNonNegativeNumber(payload.rawPetUsed);
  const adhesiveUsed = asNonNegativeNumber(payload.adhesiveUsed);
  const emptyBagsUsed = asNonNegativeNumber(payload.emptyBagsUsed);
  const colorUsed = asNonNegativeNumber(payload.colorUsed);

  const numericFields = [
    ["rawHdpeUsed", payload.rawHdpeUsed, rawHdpeUsed],
    ["rawLdpeUsed", payload.rawLdpeUsed, rawLdpeUsed],
    ["rawPetUsed", payload.rawPetUsed, rawPetUsed],
    ["adhesiveUsed", payload.adhesiveUsed, adhesiveUsed],
    ["emptyBagsUsed", payload.emptyBagsUsed, emptyBagsUsed],
    ["colorUsed", payload.colorUsed, colorUsed],
  ] as const;

  for (const [field, original, parsed] of numericFields) {
    if (original !== undefined && original !== null && parsed === null) {
      return {
        error: {
          status: 400,
          message: `${field} must be zero or a positive number`,
        },
        usages: [] as MaterialUsageEntry[],
      };
    }
  }

  const usages: MaterialUsageEntry[] = [
    { field: "rawHdpeUsed", quantity: rawHdpeUsed ?? 0 },
    { field: "rawLdpeUsed", quantity: rawLdpeUsed ?? 0 },
    { field: "rawPetUsed", quantity: rawPetUsed ?? 0 },
    { field: "adhesiveUsed", quantity: adhesiveUsed ?? 0 },
    { field: "emptyBagsUsed", quantity: emptyBagsUsed ?? 0 },
    { field: "colorUsed", quantity: colorUsed ?? 0 },
  ].filter((entry) => entry.quantity > 0);

  return { error: null, usages };
};

export const createProductionRecord = async (
  userId: number,
  payload: CreateProductionPayload,
): Promise<ServiceResult<unknown>> => {
  // machineId is optional — omit it for material-only consumption records
  const machineIdRaw = payload.machineId ? Number(payload.machineId) : null;
  if (machineIdRaw !== null && (!Number.isInteger(machineIdRaw) || machineIdRaw <= 0)) {
    return { status: 400, message: "machineId must be a positive integer" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, shiftId: true },
  });
  if (!user) return { status: 404, message: "User not found" };

  // Resolve shift
  const resolvedShiftId = payload.shiftId ?? user.shiftId;
  if (!resolvedShiftId) {
    return { status: 400, message: "shiftId is required when user has no assigned shift" };
  }
  const shift = await prisma.shift.findUnique({ where: { id: Number(resolvedShiftId) } });
  if (!shift) return { status: 404, message: "Shift not found" };

  // Machine-specific logic (piece counting, snapshot check)
  let resolvedMachineId: number | null = null;
  let cartonsCount = 0;
  let piecesPerCarton = 0;
  let totalPieces = 0;
  let resolvedWorkingCavities: number | null = null;
  let resolvedBoxes: (BoxEntry & { totalPieces: number })[] | null = null;

  if (machineIdRaw !== null) {
    const machine = await prisma.machine.findUnique({
      where: { id: machineIdRaw },
      select: { id: true, type: true, name: true },
    });
    if (!machine) return { status: 404, message: "Machine not found" };

    const productType = getProductTypeFromMachineType(machine.type);
    if (!productType) {
      return { status: 400, message: "Machine type is not mapped to a product type. Use CAPS/PREFORM machine type." };
    }

    const setting = await prisma.productionSetting.findUnique({
      where: { productType },
      select: { piecesPerCarton: true },
    });
    if (!setting) {
      return { status: 400, message: `Missing ProductionSetting for ${productType}` };
    }

    // Parse boxes if it arrived as a JSON string (FormData upload)
    if (typeof payload.boxes === "string") {
      try { payload.boxes = JSON.parse(payload.boxes as string) as BoxEntry[]; } catch { /* ignore */ }
    }

    // Validate boxes
    if (Array.isArray(payload.boxes) && payload.boxes.length > 0) {
      for (const b of payload.boxes) {
        const cav = Number(b.cavities);
        const cyc = Number(b.cycles);
        const nb = Number(b.numberOfBoxes);
        if (!Number.isInteger(cav) || cav <= 0) return { status: 400, message: "Each box must have a valid cavities count (>0)" };
        if (!Number.isInteger(cyc) || cyc < 0) return { status: 400, message: "Each box must have a valid cycles count (>=0)" };
        if (!Number.isInteger(nb) || nb <= 0) return { status: 400, message: "Each box must have a valid numberOfBoxes count (>0)" };
      }
      resolvedBoxes = payload.boxes.map((b) => ({
        cavities: Number(b.cavities),
        cycles: Number(b.cycles),
        numberOfBoxes: Number(b.numberOfBoxes),
        totalPieces: Number(b.cavities) * Number(b.cycles) * Number(b.numberOfBoxes),
      }));
    }

    piecesPerCarton = setting.piecesPerCarton;
    cartonsCount = resolvedBoxes
      ? resolvedBoxes.reduce((s, b) => s + b.numberOfBoxes, 0)
      : Number(payload.cartonsCount);

    if (!resolvedBoxes && (!Number.isInteger(cartonsCount) || cartonsCount < 0)) {
      return { status: 400, message: "cartonsCount is required and must be zero or a positive integer" };
    }

    totalPieces = resolvedBoxes
      ? resolvedBoxes.reduce((s, b) => s + b.totalPieces, 0)
      : cartonsCount * piecesPerCarton;

    const firstBoxCavities = resolvedBoxes?.[0]?.cavities ?? null;
    resolvedWorkingCavities = firstBoxCavities
      ? Math.min(Math.max(1, firstBoxCavities), 72)
      : payload.workingCavities
        ? Math.min(Math.max(1, Number(payload.workingCavities)), 72)
        : null;

    resolvedMachineId = machine.id;
  }

  // Material validation
  const materialValidation = getMaterialUsageEntries(payload);
  if (materialValidation.error) return materialValidation.error;
  const materialUsages = materialValidation.usages;

  const downtimeMinutes = asNonNegativeNumber(payload.downtimeMinutes);
  if (payload.downtimeMinutes !== undefined && payload.downtimeMinutes !== null && downtimeMinutes === null) {
    return { status: 400, message: "downtimeMinutes must be zero or a positive number" };
  }

  // Resolve raw materials for inventory deduction (soft — skip if not found)
  const rawMaterials = materialUsages.length
    ? await prisma.rawMaterial.findMany({
        select: { id: true, name: true, currentQuantity: true, unit: true },
      })
    : [];

  const resolveMaterialForUsage = (usage: MaterialUsageEntry) => {
    const normalizedAliases = getUsageAliases(usage.field).map(normalizeMaterialName);
    return rawMaterials.find((m) => {
      const nm = normalizeMaterialName(m.name);
      return normalizedAliases.some((a) => nm === a || nm.includes(a) || a.includes(nm));
    });
  };

  const resolvedMaterialByField = new Map<string, (typeof rawMaterials)[number]>();
  for (const usage of materialUsages) {
    const material = resolveMaterialForUsage(usage);
    if (material) {
      if (material.currentQuantity < usage.quantity) {
        return {
          status: 400,
          message: `Insufficient stock for ${material.name}. Available: ${material.currentQuantity} ${material.unit}`,
        };
      }
      resolvedMaterialByField.set(usage.field, material);
    }
    // If material not found in inventory, skip deduction silently
  }

  const damagedPieces = Math.max(0, Number(payload.damagedPieces ?? 0));
  const netGoodPieces = Math.max(0, totalPieces - damagedPieces);

  const production = await prisma.$transaction(async (tx) => {
    const created = await tx.productionRecord.create({
      data: {
        machineId: resolvedMachineId ?? undefined,
        userId,
        shiftId: Number(resolvedShiftId),
        hourSlot: payload.hourSlot?.trim() || generateHourSlot(),
        cartonsCount,
        piecesPerCarton,
        totalPieces,
        damagedPieces,
        netGoodPieces,
        capColor: payload.capColor?.trim() || null,
        preformType: payload.preformType?.trim() || null,
        workingCavities: resolvedWorkingCavities,
        boxesData: resolvedBoxes ? JSON.stringify(resolvedBoxes) : null,
        rawHdpeUsed: asNonNegativeNumber(payload.rawHdpeUsed),
        rawLdpeUsed: asNonNegativeNumber(payload.rawLdpeUsed),
        rawPetUsed: asNonNegativeNumber(payload.rawPetUsed),
        adhesiveUsed: asNonNegativeNumber(payload.adhesiveUsed),
        emptyBagsUsed: asNonNegativeNumber(payload.emptyBagsUsed),
        colorUsed: asNonNegativeNumber(payload.colorUsed),
        downtimeReason: payload.downtimeReason?.trim() || null,
        downtimeMinutes,
        notes: payload.notes?.trim() || null,
        documentPath: payload.documentPath || null,
        date: payload.date ? new Date(payload.date) : new Date(),
      },
      include: {
        machine: { select: { id: true, name: true, type: true } },
        shift: true,
      },
    });

    for (const usage of materialUsages) {
      const material = resolvedMaterialByField.get(usage.field);
      if (!material) continue; // skip if not in inventory

      await tx.rawMaterial.update({
        where: { id: material.id },
        data: { currentQuantity: { decrement: usage.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          materialId: material.id,
          type: InventoryType.OUT,
          quantity: usage.quantity,
          referenceType: ReferenceType.PRODUCTION,
          referenceId: created.id,
          createdById: userId,
        },
      });
    }

    return created;
  });

  auditAsync(
    userId,
    AuditAction.PRODUCTION_RECORD_CREATED,
    AuditEntityType.PRODUCTION_RECORD,
    production.id,
    { machineId: resolvedMachineId, cartonsCount, totalPieces },
  );

  void dispatchAutoNotification({
    event: "PRODUCTION_CREATED",
    actorUserId: userId,
    shiftId: Number(resolvedShiftId),
    productionId: production.id,
    totalPieces,
  }).catch((err) => console.error("[autoNotify] production:", err));

  return { status: 201, data: production };
};

export const getMyProductionRecords = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  await sendShiftCounterReminderIfNeeded(userId);

  const records = await prisma.productionRecord.findMany({
    where: { userId },
    include: {
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: records };
};

export const getAllProductionRecords = async (): Promise<
  ServiceResult<unknown>
> => {
  const records = await prisma.productionRecord.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: records };
};

export const getProductionAdminOverview = async (
  range: DateRangeFilter = {},
): Promise<ServiceResult<unknown>> => {
  const createdAtFilter = buildCreatedAtFilter(range);

  const records = await prisma.productionRecord.findMany({
    where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
      shift: {
        select: {
          id: true,
          name: true,
        },
      },
      machine: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalRecords = records.length;
  const totalCartons = records.reduce(
    (sum, item) => sum + (item.cartonsCount ?? 0),
    0,
  );
  const totalPieces = records.reduce(
    (sum, item) => sum + (item.totalPieces ?? 0),
    0,
  );

  const productionByUserMap = new Map<
    number,
    {
      userId: number;
      fullName: string;
      username: string;
      role: string;
      recordsCount: number;
      cartonsCount: number;
      totalPieces: number;
    }
  >();

  const productionByShiftMap = new Map<
    string,
    {
      shiftId: number | null;
      shiftName: string;
      recordsCount: number;
      cartonsCount: number;
      totalPieces: number;
    }
  >();

  const shiftProductMap = new Map<
    string,
    {
      date: string;
      shiftId: number | null;
      shiftName: string;
      capsCartons: number;
      preformCartons: number;
      totalCartons: number;
      totalPieces: number;
    }
  >();

  const dailyProductMap = new Map<
    string,
    {
      date: string;
      capsCartons: number;
      preformCartons: number;
      totalCartons: number;
      totalPieces: number;
    }
  >();

  const dailyRawUsageMap = new Map<
    string,
    {
      date: string;
      hdpe: number;
      ldpe: number;
      pet: number;
      adhesive: number;
      emptyBags: number;
      color: number;
      totalRawUsed: number;
    }
  >();

  const shiftRawUsageMap = new Map<
    string,
    {
      date: string;
      shiftId: number | null;
      shiftName: string;
      hdpeKg: number;
      ldpeKg: number;
      petKg: number;
      colorKg: number;
    }
  >();

  for (const record of records) {
    const user = record.user;
    const currentByUser = productionByUserMap.get(user.id) ?? {
      userId: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      recordsCount: 0,
      cartonsCount: 0,
      totalPieces: 0,
    };

    currentByUser.recordsCount += 1;
    currentByUser.cartonsCount += record.cartonsCount ?? 0;
    currentByUser.totalPieces += record.totalPieces ?? 0;
    productionByUserMap.set(user.id, currentByUser);

    const shiftKey = `${record.shift?.id ?? "none"}`;
    const currentByShift = productionByShiftMap.get(shiftKey) ?? {
      shiftId: record.shift?.id ?? null,
      shiftName: record.shift?.name ?? "Unassigned",
      recordsCount: 0,
      cartonsCount: 0,
      totalPieces: 0,
    };

    currentByShift.recordsCount += 1;
    currentByShift.cartonsCount += record.cartonsCount ?? 0;
    currentByShift.totalPieces += record.totalPieces ?? 0;
    productionByShiftMap.set(shiftKey, currentByShift);

    const dayKey = record.createdAt.toISOString().slice(0, 10);
    const machineType = record.machine?.type?.trim().toUpperCase() ?? "";
    const isCaps = machineType === "CAPS" || machineType.includes("CAP");
    const isPreform = machineType === "PREFORM" || machineType.includes("PET");

    const shiftProductKey = `${dayKey}-${record.shift?.id ?? "none"}`;
    const byShiftProduct = shiftProductMap.get(shiftProductKey) ?? {
      date: dayKey,
      shiftId: record.shift?.id ?? null,
      shiftName: record.shift?.name ?? "Unassigned",
      capsCartons: 0,
      preformCartons: 0,
      totalCartons: 0,
      totalPieces: 0,
    };
    byShiftProduct.totalCartons += record.cartonsCount ?? 0;
    byShiftProduct.totalPieces += record.totalPieces ?? 0;
    if (isCaps) {
      byShiftProduct.capsCartons += record.cartonsCount ?? 0;
    }
    if (isPreform) {
      byShiftProduct.preformCartons += record.cartonsCount ?? 0;
    }
    shiftProductMap.set(shiftProductKey, byShiftProduct);

    const byDayProduct = dailyProductMap.get(dayKey) ?? {
      date: dayKey,
      capsCartons: 0,
      preformCartons: 0,
      totalCartons: 0,
      totalPieces: 0,
    };
    byDayProduct.totalCartons += record.cartonsCount ?? 0;
    byDayProduct.totalPieces += record.totalPieces ?? 0;
    if (isCaps) {
      byDayProduct.capsCartons += record.cartonsCount ?? 0;
    }
    if (isPreform) {
      byDayProduct.preformCartons += record.cartonsCount ?? 0;
    }
    dailyProductMap.set(dayKey, byDayProduct);

    // HDPE, LDPE, PET are all stored in BAGS (matching inventory CARTON/BAG unit).
    // kg/bag is variable and not stored, so reports aggregate bag counts.
    const rawUsed = {
      hdpe: Number(record.rawHdpeUsed ?? 0),   // bags
      ldpe: Number(record.rawLdpeUsed ?? 0),   // bags
      pet: Number(record.rawPetUsed ?? 0),     // bags
      adhesive: Number(record.adhesiveUsed ?? 0),
      emptyBags: Number(record.emptyBagsUsed ?? 0),
      color: Number(record.colorUsed ?? 0),    // kg
    };

    const byDayRaw = dailyRawUsageMap.get(dayKey) ?? {
      date: dayKey,
      hdpe: 0,
      ldpe: 0,
      pet: 0,
      adhesive: 0,
      emptyBags: 0,
      color: 0,
      totalRawUsed: 0,
    };

    byDayRaw.hdpe += rawUsed.hdpe;
    byDayRaw.ldpe += rawUsed.ldpe;
    byDayRaw.pet += rawUsed.pet;
    byDayRaw.adhesive += rawUsed.adhesive;
    byDayRaw.emptyBags += rawUsed.emptyBags;
    byDayRaw.color += rawUsed.color;
    byDayRaw.totalRawUsed +=
      rawUsed.hdpe +
      rawUsed.ldpe +
      rawUsed.pet +
      rawUsed.adhesive +
      rawUsed.emptyBags +
      rawUsed.color;

    dailyRawUsageMap.set(dayKey, byDayRaw);

    // Per-shift raw material usage
    const byShiftRaw = shiftRawUsageMap.get(shiftProductKey) ?? {
      date: dayKey,
      shiftId: record.shift?.id ?? null,
      shiftName: record.shift?.name ?? "Unassigned",
      hdpeKg: 0,
      ldpeKg: 0,
      petKg: 0,
      colorKg: 0,
    };
    byShiftRaw.hdpeKg += rawUsed.hdpe;
    byShiftRaw.ldpeKg += rawUsed.ldpe;
    byShiftRaw.petKg += rawUsed.pet;
    byShiftRaw.colorKg += rawUsed.color;
    shiftRawUsageMap.set(shiftProductKey, byShiftRaw);
  }

  return {
    status: 200,
    data: {
      range,
      totals: {
        totalRecords,
        totalCartons,
        totalPieces,
      },
      byUser: Array.from(productionByUserMap.values()).sort(
        (a, b) => b.totalPieces - a.totalPieces,
      ),
      byShift: Array.from(productionByShiftMap.values()).sort(
        (a, b) => b.totalPieces - a.totalPieces,
      ),
      byShiftProduct: Array.from(shiftProductMap.values()).sort((a, b) =>
        b.date === a.date
          ? (a.shiftId ?? 0) - (b.shiftId ?? 0)
          : b.date.localeCompare(a.date),
      ),
      dailyByProduct: Array.from(dailyProductMap.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
      dailyRawMaterialUsage: Array.from(dailyRawUsageMap.values()).sort(
        (a, b) => b.date.localeCompare(a.date),
      ),
      byShiftRawUsage: Array.from(shiftRawUsageMap.values()).sort((a, b) =>
        b.date === a.date
          ? (a.shiftId ?? 0) - (b.shiftId ?? 0)
          : b.date.localeCompare(a.date),
      ),
      recentRecords: records.slice(0, 25),
    },
  };
};

export const updateProductionRecord = async (
  userId: number,
  recordId: number,
  payload: Partial<CreateProductionPayload>,
  isAdmin: boolean,
): Promise<ServiceResult<unknown>> => {
  const record = await prisma.productionRecord.findUnique({ where: { id: recordId } });
  if (!record) return { status: 404, message: "Production record not found" };
  if (!isAdmin && record.userId !== userId) {
    return { status: 403, message: "You can only edit your own production records" };
  }

  const damagedPieces = payload.damagedPieces !== undefined
    ? Math.max(0, Number(payload.damagedPieces))
    : record.damagedPieces;
  const baseTotalPieces = payload.cartonsCount !== undefined
    ? Number(payload.cartonsCount) * record.piecesPerCarton
    : record.totalPieces;
  const netGoodPieces = Math.max(0, baseTotalPieces - damagedPieces);

  const updated = await prisma.productionRecord.update({
    where: { id: recordId },
    data: {
      ...(payload.notes !== undefined && { notes: payload.notes?.trim() || null }),
      ...(payload.damagedPieces !== undefined && { damagedPieces, netGoodPieces }),
      ...(payload.capColor !== undefined && { capColor: payload.capColor?.trim() || null }),
      ...(payload.preformType !== undefined && { preformType: payload.preformType?.trim() || null }),
      ...(payload.downtimeReason !== undefined && { downtimeReason: payload.downtimeReason?.trim() || null }),
      ...(payload.downtimeMinutes !== undefined && { downtimeMinutes: Number(payload.downtimeMinutes) }),
      ...(payload.date !== undefined && { date: new Date(payload.date) }),
    },
    include: {
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
  });

  auditAsync(userId, AuditAction.PRODUCTION_RECORD_UPDATED, AuditEntityType.PRODUCTION_RECORD, recordId, { damagedPieces, netGoodPieces });

  return { status: 200, data: updated };
};

export const deleteProductionRecord = async (
  userId: number,
  recordId: number,
  isAdmin: boolean,
): Promise<ServiceResult<unknown>> => {
  const record = await prisma.productionRecord.findUnique({ where: { id: recordId } });
  if (!record) return { status: 404, message: "Production record not found" };
  if (!isAdmin && record.userId !== userId) {
    return { status: 403, message: "You can only delete your own production records" };
  }

  await prisma.productionRecord.delete({ where: { id: recordId } });

  auditAsync(userId, AuditAction.PRODUCTION_RECORD_DELETED, AuditEntityType.PRODUCTION_RECORD, recordId, {});

  return { status: 200, message: "Production record deleted" };
};

export const getDailyRawDeductionFromInventoryTransactions = async (
  range: DateRangeFilter = {},
): Promise<ServiceResult<unknown>> => {
  const createdAtFilter = buildCreatedAtFilter(range);

  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      type: InventoryType.OUT,
      referenceType: ReferenceType.PRODUCTION,
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    },
    include: {
      material: {
        select: {
          name: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byDay = new Map<string, InventoryDailyDeductionRow>();

  for (const tx of transactions) {
    const dayKey = tx.createdAt.toISOString().slice(0, 10);
    const current = byDay.get(dayKey) ?? {
      date: dayKey,
      hdpe: 0,
      ldpe: 0,
      pet: 0,
      adhesive: 0,
      emptyBags: 0,
      color: 0,
      other: 0,
      totalRawUsed: 0,
    };

    const materialBucket = classifyMaterialByName(tx.material?.name ?? "");
    current[materialBucket] += Number(tx.quantity ?? 0);
    current.totalRawUsed += Number(tx.quantity ?? 0);

    byDay.set(dayKey, current);
  }

  const daily = Array.from(byDay.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const totals = daily.reduce(
    (acc, row) => {
      acc.hdpe += row.hdpe;
      acc.ldpe += row.ldpe;
      acc.pet += row.pet;
      acc.adhesive += row.adhesive;
      acc.emptyBags += row.emptyBags;
      acc.color += row.color;
      acc.other += row.other;
      acc.totalRawUsed += row.totalRawUsed;
      return acc;
    },
    {
      hdpe: 0,
      ldpe: 0,
      pet: 0,
      adhesive: 0,
      emptyBags: 0,
      color: 0,
      other: 0,
      totalRawUsed: 0,
    },
  );

  return {
    status: 200,
    data: {
      range,
      daily,
      totals,
    },
  };
};
