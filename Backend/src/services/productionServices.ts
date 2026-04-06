import { ProductType } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type CreateProductionPayload = {
  machineId?: number;
  shiftId?: number;
  hourSlot?: string;
  cartonsCount?: number;
  rawHdpeUsed?: number;
  rawLdpeUsed?: number;
  rawPetUsed?: number;
  adhesiveUsed?: number;
  emptyBagsUsed?: number;
  colorUsed?: number;
  downtimeReason?: string;
  downtimeMinutes?: number;
  notes?: string;
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

export const createProductionRecord = async (
  userId: number,
  payload: CreateProductionPayload,
): Promise<ServiceResult<unknown>> => {
  const machineId = Number(payload.machineId);
  const cartonsCount = Number(payload.cartonsCount);

  if (!Number.isInteger(machineId) || machineId <= 0) {
    return {
      status: 400,
      message: "machineId is required and must be a positive integer",
    };
  }

  if (!Number.isInteger(cartonsCount) || cartonsCount < 0) {
    return {
      status: 400,
      message:
        "cartonsCount is required and must be zero or a positive integer",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, shiftId: true },
  });

  if (!user) {
    return { status: 404, message: "User not found" };
  }

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: { id: true, type: true, name: true },
  });

  if (!machine) {
    return { status: 404, message: "Machine not found" };
  }

  const productType = getProductTypeFromMachineType(machine.type);
  if (!productType) {
    return {
      status: 400,
      message:
        "Machine type is not mapped to a product type. Use CAPS/PREFORM machine type.",
    };
  }

  const setting = await prisma.productionSetting.findUnique({
    where: { productType },
    select: { piecesPerCarton: true },
  });

  if (!setting) {
    return {
      status: 400,
      message: `Missing ProductionSetting for ${productType}`,
    };
  }

  const resolvedShiftId = payload.shiftId ?? user.shiftId;
  if (!resolvedShiftId) {
    return {
      status: 400,
      message: "shiftId is required when user has no assigned shift",
    };
  }

  const shift = await prisma.shift.findUnique({
    where: { id: Number(resolvedShiftId) },
  });
  if (!shift) {
    return { status: 404, message: "Shift not found" };
  }

  const rawHdpeUsed = asNonNegativeNumber(payload.rawHdpeUsed);
  const rawLdpeUsed = asNonNegativeNumber(payload.rawLdpeUsed);
  const rawPetUsed = asNonNegativeNumber(payload.rawPetUsed);
  const adhesiveUsed = asNonNegativeNumber(payload.adhesiveUsed);
  const emptyBagsUsed = asNonNegativeNumber(payload.emptyBagsUsed);
  const colorUsed = asNonNegativeNumber(payload.colorUsed);
  const downtimeMinutes = asNonNegativeNumber(payload.downtimeMinutes);

  const numericFields = [
    ["rawHdpeUsed", payload.rawHdpeUsed, rawHdpeUsed],
    ["rawLdpeUsed", payload.rawLdpeUsed, rawLdpeUsed],
    ["rawPetUsed", payload.rawPetUsed, rawPetUsed],
    ["adhesiveUsed", payload.adhesiveUsed, adhesiveUsed],
    ["emptyBagsUsed", payload.emptyBagsUsed, emptyBagsUsed],
    ["colorUsed", payload.colorUsed, colorUsed],
    ["downtimeMinutes", payload.downtimeMinutes, downtimeMinutes],
  ];

  for (const [field, original, parsed] of numericFields) {
    if (
      original !== undefined &&
      original !== null &&
      original !== "" &&
      parsed === null
    ) {
      return {
        status: 400,
        message: `${field} must be zero or a positive number`,
      };
    }
  }

  const piecesPerCarton = setting.piecesPerCarton;
  const totalPieces = cartonsCount * piecesPerCarton;

  const production = await prisma.productionRecord.create({
    data: {
      machineId: machine.id,
      userId,
      shiftId: Number(resolvedShiftId),
      hourSlot: payload.hourSlot?.trim() || generateHourSlot(),
      cartonsCount,
      piecesPerCarton,
      totalPieces,
      rawHdpeUsed,
      rawLdpeUsed,
      rawPetUsed,
      adhesiveUsed,
      emptyBagsUsed,
      colorUsed,
      downtimeReason: payload.downtimeReason?.trim() || null,
      downtimeMinutes,
      notes: payload.notes?.trim() || null,
    },
    include: {
      machine: { select: { id: true, name: true, type: true } },
      shift: true,
    },
  });

  auditAsync(
    userId,
    AuditAction.PRODUCTION_RECORD_CREATED,
    AuditEntityType.PRODUCTION_RECORD,
    production.id,
    {
      machineId: machine.id,
      machineName: machine.name,
      cartonsCount,
      totalPieces,
    },
  );

  return { status: 201, data: production };
};

export const getMyProductionRecords = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
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

export const getProductionAdminOverview = async (): Promise<
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
  }

  return {
    status: 200,
    data: {
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
      recentRecords: records.slice(0, 25),
    },
  };
};
