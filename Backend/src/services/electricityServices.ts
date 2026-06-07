import { UserRole } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { sendPushToUsers } from "./pushService";

type ServiceResult<T = unknown> = {
  status: number;
  message?: string;
  data?: T;
};

// ─── kWh Price management ────────────────────────────────────────────────────

export const getCurrentKwhPrice = async (): Promise<ServiceResult> => {
  const price = await prisma.electricityKwhPrice.findFirst({
    orderBy: { effectiveFrom: "desc" },
    include: { setBy: { select: { fullName: true, username: true } } },
  });
  return { status: 200, data: price };
};

export const getKwhPriceHistory = async (): Promise<ServiceResult> => {
  const prices = await prisma.electricityKwhPrice.findMany({
    orderBy: { effectiveFrom: "desc" },
    include: { setBy: { select: { fullName: true, username: true } } },
  });
  return { status: 200, data: prices };
};

export const setKwhPrice = async (
  userId: number,
  price: unknown,
  notes?: unknown,
): Promise<ServiceResult> => {
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return { status: 400, message: "Price must be a positive number" };
  }
  const record = await prisma.electricityKwhPrice.create({
    data: {
      price: priceNum,
      notes: typeof notes === "string" ? notes.trim() || null : null,
      setById: userId,
    },
    include: { setBy: { select: { fullName: true, username: true } } },
  });
  return { status: 201, data: record };
};

// ─── Readings ────────────────────────────────────────────────────────────────

export const createElectricityReading = async (
  recordedById: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult> => {
  const { date, shiftId, startReading, endReading, isMeterReset, maxMeterValue, notes, imagePath, responsibleEngineerId } = payload;

  if (!date || typeof date !== "string") return { status: 400, message: "date is required" };
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return { status: 400, message: "Invalid date format" };

  const shiftIdNum = Number(shiftId);
  if (!Number.isFinite(shiftIdNum)) return { status: 400, message: "shiftId is required" };

  const start = Number(startReading);
  const end = Number(endReading);
  if (!Number.isFinite(start) || start < 0) return { status: 400, message: "startReading must be a non-negative number" };
  if (!Number.isFinite(end) || end < 0) return { status: 400, message: "endReading must be a non-negative number" };

  const resetFlag = Boolean(isMeterReset);
  const maxVal = resetFlag ? Number(maxMeterValue) : null;

  if (resetFlag) {
    if (!maxVal || !Number.isFinite(maxVal) || maxVal <= 0) {
      return { status: 400, message: "maxMeterValue is required when meter reset is enabled" };
    }
    if (start >= maxVal) {
      return { status: 400, message: "startReading must be less than maxMeterValue" };
    }
  } else {
    if (end <= start) {
      return {
        status: 400,
        message: "Invalid meter reading: End value must be greater than start value",
      };
    }
  }

  const consumption = resetFlag && maxVal
    ? (maxVal - start) + end
    : end - start;

  const currentPrice = await prisma.electricityKwhPrice.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });
  if (!currentPrice) {
    return { status: 400, message: "No kWh price configured. Please set a kWh price in admin settings first." };
  }

  const shiftExists = await prisma.shift.findUnique({ where: { id: shiftIdNum } });
  if (!shiftExists) return { status: 404, message: "Shift not found" };

  const duplicate = await prisma.electricityReading.findFirst({
    where: {
      date: parsedDate,
      shiftId: shiftIdNum,
    },
  });
  if (duplicate) {
    return { status: 409, message: "A reading for this shift and date already exists" };
  }

  // Sequential counter check: startReading must be >= last endReading (unless meter was reset)
  if (!resetFlag) {
    const lastReading = await prisma.electricityReading.findFirst({
      where: {
        OR: [
          { date: { lt: parsedDate } },
          { date: parsedDate, shiftId: { lt: shiftIdNum } },
        ],
        isMeterReset: false,
      },
      orderBy: [{ date: "desc" }, { shiftId: "desc" }],
    });
    if (lastReading && start < lastReading.endReading) {
      return {
        status: 400,
        message: `Counter must be sequential. The last recorded end reading was ${lastReading.endReading}. Your start reading (${start}) is lower than the previous end reading. If the meter was physically reset, enable the "Meter Reset" option so an admin can verify and correct it.`,
      };
    }
  }

  const respEngId = responsibleEngineerId ? Number(responsibleEngineerId) : null;

  const reading = await prisma.electricityReading.create({
    data: {
      date: parsedDate,
      shiftId: shiftIdNum,
      startReading: start,
      endReading: end,
      isMeterReset: resetFlag,
      maxMeterValue: maxVal,
      consumption,
      kwhPriceId: currentPrice.id,
      kwhPriceSnap: currentPrice.price,
      shiftCost: consumption * currentPrice.price,
      notes: typeof notes === "string" ? notes.trim() || null : null,
      imagePath: typeof imagePath === "string" ? imagePath.trim() || null : null,
      recordedById,
      responsibleEngineerId: respEngId,
    },
    include: {
      shift: { select: { id: true, name: true } },
      recordedBy: { select: { fullName: true, username: true } },
      responsibleEngineer: { select: { fullName: true, username: true } },
      kwhPrice: { select: { price: true } },
    },
  });

  // Notify admins about the new electricity reading (fire-and-forget)
  void (async () => {
    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (admins.length === 0) return;
      const adminIds = admins.map(a => a.id);
      const recorder = reading.recordedBy as { fullName?: string; username?: string };
      const shift = reading.shift as { name?: string };
      const title = "New Electricity Reading";
      const message = `${recorder?.fullName ?? `User #${recordedById}`} recorded ${consumption.toFixed(1)} kWh for shift "${shift?.name ?? shiftIdNum}".`;

      const notes = await prisma.$transaction(
        adminIds.map(userId =>
          prisma.notification.create({
            data: { userId, title, message, type: "SYSTEM_MESSAGE" },
          }),
        ),
      );
      notes.forEach(n => {
        emitNotificationToUser(n.userId, n);
        emitNotificationUnreadCountUpdate(n.userId, { refresh: true });
      });
      sendPushToUsers(adminIds, title, message, { type: "SYSTEM_MESSAGE" }).catch(() => undefined);
    } catch { /* ignore */ }
  })();

  return { status: 201, data: reading };
};

export const getElectricityReadings = async (
  filters: Record<string, unknown>,
  requesterRole: string,
  requesterId: number,
): Promise<ServiceResult> => {
  const { fromDate, toDate, shiftId, month, year } = filters;

  const where: Record<string, unknown> = {};

  if (fromDate && typeof fromDate === "string") {
    where.date = { gte: new Date(`${fromDate}T00:00:00.000`) };
  }
  if (toDate && typeof toDate === "string") {
    where.date = { ...(where.date as object || {}), lte: new Date(`${toDate}T23:59:59.999`) };
  }
  if (shiftId) where.shiftId = Number(shiftId);

  if (month || year) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) - 1 : 0;
    const startOfPeriod = month
      ? new Date(y, m, 1)
      : new Date(y, 0, 1);
    const endOfPeriod = month
      ? new Date(y, m + 1, 0, 23, 59, 59, 999)
      : new Date(y, 11, 31, 23, 59, 59, 999);
    where.date = { gte: startOfPeriod, lte: endOfPeriod };
  }

  if (requesterRole === UserRole.WORKER || requesterRole === UserRole.ENGINEER) {
    where.recordedById = requesterId;
  }

  const readings = await prisma.electricityReading.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    include: {
      shift: { select: { id: true, name: true } },
      recordedBy: { select: { fullName: true, username: true } },
      responsibleEngineer: { select: { fullName: true, username: true } },
    },
    orderBy: [{ date: "desc" }, { shiftId: "asc" }],
  });

  return { status: 200, data: readings };
};

export const getElectricityReport = async (
  filters: Record<string, unknown>,
): Promise<ServiceResult> => {
  const { fromDate, toDate, month, year } = filters;

  let startDate: Date;
  let endDate: Date;

  if (fromDate && typeof fromDate === "string") {
    startDate = new Date(`${fromDate}T00:00:00.000`);
    endDate = toDate && typeof toDate === "string"
      ? new Date(`${toDate}T23:59:59.999`)
      : new Date();
  } else if (month || year) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) - 1 : 0;
    startDate = month ? new Date(y, m, 1) : new Date(y, 0, 1);
    endDate = month ? new Date(y, m + 1, 0, 23, 59, 59, 999) : new Date(y, 11, 31, 23, 59, 59, 999);
  } else {
    // Default last 30 days
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
  }

  const readings = await prisma.electricityReading.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { shift: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { shiftId: "asc" }],
  });

  const currentPrice = await prisma.electricityKwhPrice.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });

  // Group by date
  const dayMap = new Map<string, {
    date: string;
    shifts: typeof readings;
    totalConsumption: number;
    totalCost: number;
  }>();

  for (const r of readings) {
    const dateKey = r.date.toISOString().slice(0, 10);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { date: dateKey, shifts: [], totalConsumption: 0, totalCost: 0 });
    }
    const day = dayMap.get(dateKey)!;
    day.shifts.push(r);
    day.totalConsumption += r.consumption;
    day.totalCost += r.shiftCost;
  }

  const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const summary = {
    totalConsumption: readings.reduce((s, r) => s + r.consumption, 0),
    totalCost: readings.reduce((s, r) => s + r.shiftCost, 0),
    totalReadings: readings.length,
    currentKwhPrice: currentPrice?.price ?? 0,
  };

  return {
    status: 200,
    data: {
      range: {
        fromDate: startDate.toISOString().slice(0, 10),
        toDate: endDate.toISOString().slice(0, 10),
      },
      currentKwhPrice: currentPrice?.price ?? 0,
      days,
      summary,
    },
  };
};

// ─── Admin: correct / override a reading ────────────────────────────────────

export const updateElectricityReading = async (
  id: number,
  payload: Record<string, unknown>,
): Promise<ServiceResult> => {
  const existing = await prisma.electricityReading.findUnique({ where: { id } });
  if (!existing) return { status: 404, message: "Reading not found" };

  const start = payload.startReading !== undefined ? Number(payload.startReading) : existing.startReading;
  const end   = payload.endReading   !== undefined ? Number(payload.endReading)   : existing.endReading;
  const reset = payload.isMeterReset !== undefined ? Boolean(payload.isMeterReset) : existing.isMeterReset;
  const maxVal = reset ? (payload.maxMeterValue !== undefined ? Number(payload.maxMeterValue) : existing.maxMeterValue) : null;

  if (!Number.isFinite(start) || start < 0) return { status: 400, message: "startReading must be a non-negative number" };
  if (!Number.isFinite(end)   || end   < 0) return { status: 400, message: "endReading must be a non-negative number" };
  if (!reset && end <= start) return { status: 400, message: "End reading must be greater than start reading" };

  const consumption = reset && maxVal ? (maxVal - start) + end : end - start;
  const shiftCost = consumption * existing.kwhPriceSnap;

  const updated = await prisma.electricityReading.update({
    where: { id },
    data: {
      startReading: start,
      endReading: end,
      isMeterReset: reset,
      maxMeterValue: maxVal,
      consumption,
      shiftCost,
      notes: payload.notes !== undefined ? (typeof payload.notes === "string" ? payload.notes.trim() || null : null) : existing.notes,
    },
    include: {
      shift: { select: { id: true, name: true } },
      recordedBy: { select: { fullName: true, username: true } },
    },
  });

  return { status: 200, data: updated };
};

export const deleteElectricityReading = async (
  id: number,
  requesterId: number,
  requesterRole: string,
): Promise<ServiceResult> => {
  const reading = await prisma.electricityReading.findUnique({ where: { id } });
  if (!reading) return { status: 404, message: "Reading not found" };

  if (
    requesterRole !== UserRole.ADMIN &&
    requesterRole !== UserRole.ACCOUNTANT &&
    reading.recordedById !== requesterId
  ) {
    return { status: 403, message: "You can only delete your own readings" };
  }

  await prisma.electricityReading.delete({ where: { id } });
  return { status: 200, message: "Reading deleted" };
};
