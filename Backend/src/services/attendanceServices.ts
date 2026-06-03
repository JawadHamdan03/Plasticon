import { prisma } from "../config/lib/prisma";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
import { calculateDailyPayroll } from "./payrollServices";

// Grace period defaults — overridden by AttendanceSetting row in DB
let LATE_GRACE_MINUTES = 30;
let OVERTIME_GRACE_MINUTES = 30;

// Load grace periods once from DB at startup
(async () => {
  try {
    const setting = await prisma.attendanceSetting.findFirst();
    if (setting) {
      LATE_GRACE_MINUTES = setting.lateGraceMinutes;
      OVERTIME_GRACE_MINUTES = setting.overtimeGraceMinutes;
    }
  } catch { /* ignore — defaults remain */ }
})();

export const getAttendanceSettings = async (): Promise<{ lateGraceMinutes: number; overtimeGraceMinutes: number }> => {
  try {
    let setting = await prisma.attendanceSetting.findFirst();
    if (!setting) {
      setting = await prisma.attendanceSetting.create({ data: { lateGraceMinutes: 30, overtimeGraceMinutes: 30 } });
    }
    return { lateGraceMinutes: setting.lateGraceMinutes, overtimeGraceMinutes: setting.overtimeGraceMinutes };
  } catch { /* fallback */ }
  return { lateGraceMinutes: LATE_GRACE_MINUTES, overtimeGraceMinutes: OVERTIME_GRACE_MINUTES };
};

export const updateAttendanceSettings = async (payload: { lateGraceMinutes?: number; overtimeGraceMinutes?: number }) => {
  let setting = await prisma.attendanceSetting.findFirst();
  const newLate = payload.lateGraceMinutes !== undefined ? Math.max(0, payload.lateGraceMinutes) : (setting?.lateGraceMinutes ?? LATE_GRACE_MINUTES);
  const newOT = payload.overtimeGraceMinutes !== undefined ? Math.max(0, payload.overtimeGraceMinutes) : (setting?.overtimeGraceMinutes ?? OVERTIME_GRACE_MINUTES);
  if (!setting) {
    setting = await prisma.attendanceSetting.create({ data: { lateGraceMinutes: newLate, overtimeGraceMinutes: newOT } });
  } else {
    setting = await prisma.attendanceSetting.update({ where: { id: setting.id }, data: { lateGraceMinutes: newLate, overtimeGraceMinutes: newOT } });
  }
  LATE_GRACE_MINUTES = newLate;
  OVERTIME_GRACE_MINUTES = newOT;
  return { lateGraceMinutes: newLate, overtimeGraceMinutes: newOT };
};

const minutesBetween = (later: Date, earlier: Date): number => {
  return Math.floor((later.getTime() - earlier.getTime()) / 60000);
};

const parseDateInput = (
  value: string | Date | null | undefined,
): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateLateMinutes = (shiftStart: Date, checkIn: Date): number => {
  if (checkIn.getTime() <= shiftStart.getTime()) {
    return 0;
  }
  return Math.max(0, minutesBetween(checkIn, shiftStart) - LATE_GRACE_MINUTES);
};

const calculateOvertimeMinutes = (
  shiftEnd: Date,
  checkOut: Date | null,
): number => {
  if (!checkOut || checkOut.getTime() <= shiftEnd.getTime()) {
    return 0;
  }
  return Math.max(0, minutesBetween(checkOut, shiftEnd) - OVERTIME_GRACE_MINUTES);
};

// Shift times are stored as "1970-01-01THH:MM:00.000Z" (UTC hours/minutes carry the
// intended time-of-day). Extract as minutes-since-midnight so we can compare against
// the current wall-clock time regardless of the stored epoch date.
function shiftTimeToMinutes(stored: Date | string): number {
  const d = typeof stored === "string" ? new Date(stored) : stored;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// Return a Date representing "today at the stored shift time (local hours/minutes)".
function todayAtShiftTime(stored: Date | string): Date {
  const d = typeof stored === "string" ? new Date(stored) : stored;
  const result = new Date();
  result.setHours(d.getUTCHours(), d.getUTCMinutes(), 0, 0);
  return result;
}

// Find whichever shift is currently active based on the wall-clock time.
async function getCurrentActiveShift(): Promise<{ id: number; name: string; startTime: Date | string; endTime: Date | string } | null> {
  const shifts = await prisma.shift.findMany();
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  for (const s of shifts) {
    if (!s.startTime || !s.endTime) continue;
    const startMins = shiftTimeToMinutes(s.startTime as unknown as string);
    const endMins   = shiftTimeToMinutes(s.endTime   as unknown as string);
    if (endMins <= startMins) {
      // overnight shift (e.g. 22:00–06:00)
      if (nowMins >= startMins || nowMins < endMins) return s as any;
    } else {
      if (nowMins >= startMins && nowMins < endMins) return s as any;
    }
  }
  return null;
}

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const checkIn = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { shift: true },
  });

  if (!user) {
    return { status: 404, message: "User not found" };
  }

  const now = new Date();

  // Auto-close any open attendance record (today OR previous days).
  // We never block here — a forgotten checkout or server restart must not permanently
  // prevent a user from checking in again.
  const existingOpen = await prisma.attendance.findFirst({
    where: { userId, checkOut: null },
    orderBy: { createdAt: "desc" },
  });

  if (existingOpen) {
    await prisma.attendance.update({
      where: { id: existingOpen.id },
      data: {
        checkOut: new Date(new Date(existingOpen.checkIn).getTime() + 8 * 3_600_000),
        overtimeMinutes: 0,
      },
    });
  }

  // Detect which shift is currently active based on wall-clock time,
  // then fall back to the user's assigned shift if none matches.
  const activeShift = await getCurrentActiveShift();
  const shiftId: number | null = activeShift?.id ?? user.shiftId ?? null;
  const isFriday = now.getDay() === 5;

  // No duplicate check — users are allowed multiple check-ins per day.
  // Each check-in must have its own check-out (enforced by the auto-close above).

  // Calculate late minutes using time-of-day comparison (fixes the 1970-epoch bug)
  let lateMinutes = 0;
  if (activeShift?.startTime && !isFriday) {
    const shiftStartToday = todayAtShiftTime(activeShift.startTime as unknown as string);
    lateMinutes = calculateLateMinutes(shiftStartToday, now);
  }

  const attendance = await prisma.attendance.create({
    data: { userId, shiftId, checkIn: now, lateMinutes, overtimeMinutes: 0 },
  });

  auditAsync(userId, AuditAction.ATTENDANCE_CHECKED_IN, AuditEntityType.ATTENDANCE, attendance.id);
  return { status: 201, data: attendance };
};

const validateRequiredRecords = async (
  userId: number,
  shiftId: number | null,
  checkInDate: Date,
): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const role = user?.role;

  const dayStart = new Date(checkInDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(checkInDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (role === "WORKER" || role === "ENGINEER") {
    const productionRecord = await prisma.productionRecord.findFirst({
      where: {
        userId,
        ...(shiftId ? { shiftId } : {}),
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });
    if (!productionRecord) {
      return "يجب تسجيل الإنتاج قبل تسجيل الخروج. / Production record required before checkout.";
    }

    const electricityReading = await prisma.electricityReading.findFirst({
      where: {
        recordedById: userId,
        ...(shiftId ? { shiftId } : {}),
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });
    if (!electricityReading) {
      return "يجب تسجيل قراءة الكهرباء قبل تسجيل الخروج. / Electricity reading required before checkout.";
    }
  }

  if (role === "ACCOUNTANT") {
    const inventoryTx = await prisma.inventoryTransaction.findFirst({
      where: {
        createdById: userId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });
    if (!inventoryTx) {
      return "يجب تسجيل حركة مخزونية (الاستهلاك) قبل تسجيل الخروج. / Consumption (inventory) record required before checkout.";
    }
  }

  return null;
};

export const checkOut = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const now = new Date();

  const openAttendance = await prisma.attendance.findFirst({
    where: {
      userId,
      checkOut: null,
    },
    include: { shift: true },
    orderBy: { createdAt: "desc" },
  });

  if (!openAttendance) {
    return { status: 404, message: "No open attendance record found" };
  }

  const checkInDay = new Date(openAttendance.checkIn).getDay();
  const isFridayShift = checkInDay === 5;

  // Friday work: all hours are overtime — skip shift-end restriction and required-records check
  if (isFridayShift) {
    const workedMinutes = minutesBetween(now, new Date(openAttendance.checkIn));
    const attendance = await prisma.attendance.update({
      where: { id: openAttendance.id },
      data: { checkOut: now, overtimeMinutes: Math.max(0, workedMinutes) },
    });
    auditAsync(userId, AuditAction.ATTENDANCE_CHECKED_OUT, AuditEntityType.ATTENDANCE, attendance.id);
    calculateDailyPayroll(attendance.id, userId).catch((err) =>
      console.error("Auto daily-payroll calculation failed:", err),
    );
    return { status: 200, data: attendance };
  }

  // Calculate overtime using time-of-day comparison (fixes the 1970-epoch bug).
  // Workers are always allowed to check out — no early-checkout restriction.
  let overtimeMinutes = 0;
  if (openAttendance.shift?.endTime) {
    const shiftEndToday = todayAtShiftTime(openAttendance.shift.endTime as unknown as string);

    // For overnight shifts (end < start) the shift end falls on the *next* calendar day
    if (openAttendance.shift.startTime) {
      const startMins = shiftTimeToMinutes(openAttendance.shift.startTime as unknown as string);
      const endMins   = shiftTimeToMinutes(openAttendance.shift.endTime   as unknown as string);
      if (endMins <= startMins) {
        shiftEndToday.setDate(shiftEndToday.getDate() + 1);
      }
    }

    const minsAfter = minutesBetween(now, shiftEndToday);
    overtimeMinutes = Math.max(0, minsAfter - OVERTIME_GRACE_MINUTES);
  }

  const attendance = await prisma.attendance.update({
    where: { id: openAttendance.id },
    data: { checkOut: now, overtimeMinutes },
  });

  auditAsync(userId, AuditAction.ATTENDANCE_CHECKED_OUT, AuditEntityType.ATTENDANCE, attendance.id);
  calculateDailyPayroll(attendance.id, userId).catch((err) =>
    console.error("Auto daily-payroll calculation failed:", err),
  );
  return { status: 200, data: attendance };
};

export const getMyAttendances = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const attendances = await prisma.attendance.findMany({
    where: { userId },
    include: {
      shift: true,
    },
    orderBy: { checkIn: "desc" },
  });

  return { status: 200, data: attendances };
};

export const getAllAttendances = async (filters?: {
  date?: string;
  fromDate?: string;
  toDate?: string;
  shiftId?: number;
  userId?: number;
}): Promise<ServiceResult<unknown>> => {
  const where: {
    userId?: number;
    shiftId?: number;
    checkIn?: { gte?: Date; lte?: Date };
  } = {};

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.shiftId) {
    where.shiftId = filters.shiftId;
  }

  if (filters?.date) {
    const baseDate = new Date(filters.date);
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseDate);
    end.setHours(23, 59, 59, 999);
    where.checkIn = { gte: start, lte: end };
  } else if (filters?.fromDate || filters?.toDate) {
    where.checkIn = {};
    if (filters.fromDate) {
      const from = new Date(filters.fromDate);
      from.setHours(0, 0, 0, 0);
      where.checkIn.gte = from;
    }
    if (filters.toDate) {
      const to = new Date(filters.toDate);
      to.setHours(23, 59, 59, 999);
      where.checkIn.lte = to;
    }
  }

  const attendances = await prisma.attendance.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
      shift: true,
    },
    orderBy: { checkIn: "desc" },
  });

  return { status: 200, data: attendances };
};

export const deleteAttendance = async (
  attendanceId: number,
  deletedById: number,
): Promise<ServiceResult<{ message: string }>> => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: {
      id: true,
      userId: true,
      checkIn: true,
      checkOut: true,
      lateMinutes: true,
      overtimeMinutes: true,
    },
  });

  if (!attendance) {
    return { status: 404, message: "Attendance record not found" };
  }

  await prisma.attendance.delete({ where: { id: attendanceId } });

  auditAsync(
    deletedById,
    AuditAction.ATTENDANCE_UPDATED,
    AuditEntityType.ATTENDANCE,
    attendanceId,
    {
      deleted: true,
      deletedAttendance: attendance,
    },
  );

  return {
    status: 200,
    data: { message: "Attendance record deleted" },
  };
};

export const createAttendanceForUser = async (
  adminId: number,
  payload: {
    userId: number;
    checkIn: string | Date;
    checkOut?: string | Date | null;
    shiftId?: number | null;
    notes?: string | null;
  },
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { shift: true },
  });

  if (!user) return { status: 404, message: "User not found" };

  const checkInDate = parseDateInput(payload.checkIn);
  if (!checkInDate)
    return { status: 400, message: "checkIn is required and must be a valid date" };

  const checkOutDate =
    payload.checkOut !== undefined && payload.checkOut !== null
      ? parseDateInput(payload.checkOut)
      : null;

  if (checkOutDate && checkOutDate.getTime() < checkInDate.getTime())
    return { status: 400, message: "checkOut cannot be earlier than checkIn" };

  let shiftId: number | null =
    payload.shiftId !== undefined ? (payload.shiftId ?? null) : (user.shiftId ?? null);

  let effectiveShift: { startTime: Date; endTime: Date } | null = null;
  if (shiftId) {
    effectiveShift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { startTime: true, endTime: true },
    });
    if (!effectiveShift) shiftId = null;
  }

  const isFriday = checkInDate.getDay() === 5;
  const lateMinutes = isFriday ? 0 : (effectiveShift
    ? calculateLateMinutes(new Date(effectiveShift.startTime), checkInDate)
    : 0);
  const overtimeMinutes = isFriday
    ? (checkOutDate ? minutesBetween(checkOutDate, checkInDate) : 0)
    : (effectiveShift ? calculateOvertimeMinutes(new Date(effectiveShift.endTime), checkOutDate) : 0);

  const attendance = await prisma.attendance.create({
    data: {
      userId: payload.userId,
      shiftId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      lateMinutes,
      overtimeMinutes,
      notes: payload.notes ?? null,
    },
    include: {
      user: { select: { id: true, fullName: true, username: true, role: true } },
      shift: true,
    },
  });

  auditAsync(adminId, AuditAction.ATTENDANCE_UPDATED, AuditEntityType.ATTENDANCE, attendance.id, {
    action: "ADMIN_CREATED",
    forUserId: payload.userId,
  });

  if (checkOutDate) {
    calculateDailyPayroll(attendance.id, adminId).catch((err) =>
      console.error("Auto daily-payroll calculation failed:", err),
    );
  }

  return { status: 201, data: attendance };
};

export const updateAttendance = async (
  attendanceId: number,
  payload: {
    checkIn?: string | Date;
    checkOut?: string | Date | null;
    notes?: string | null;
  },
): Promise<ServiceResult<unknown>> => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      user: {
        include: {
          shift: true,
        },
      },
      shift: true,
    },
  });

  if (!attendance) {
    return { status: 404, message: "Attendance record not found" };
  }

  const nextCheckIn = parseDateInput(payload.checkIn) ?? attendance.checkIn;
  if (!nextCheckIn) {
    return { status: 400, message: "checkIn is required" };
  }

  const nextCheckOut =
    payload.checkOut === undefined
      ? attendance.checkOut
      : parseDateInput(payload.checkOut);

  if (
    payload.checkOut !== null &&
    payload.checkOut !== undefined &&
    nextCheckOut === null
  ) {
    return { status: 400, message: "checkOut must be a valid date or null" };
  }

  if (nextCheckOut && nextCheckOut.getTime() < nextCheckIn.getTime()) {
    return {
      status: 400,
      message: "checkOut cannot be earlier than checkIn",
    };
  }

  const effectiveShift = attendance.shift ?? attendance.user.shift ?? null;
  const isFriday = nextCheckIn.getDay() === 5;
  let lateMinutes = 0;
  let overtimeMinutes = 0;

  if (isFriday) {
    // Friday work = all hours count as overtime, no late penalty
    lateMinutes = 0;
    overtimeMinutes = nextCheckOut ? minutesBetween(nextCheckOut, nextCheckIn) : 0;
  } else if (effectiveShift) {
    const shiftStart = new Date(effectiveShift.startTime);
    const shiftEnd = new Date(effectiveShift.endTime);
    lateMinutes = calculateLateMinutes(shiftStart, nextCheckIn);
    overtimeMinutes = calculateOvertimeMinutes(shiftEnd, nextCheckOut);
  }

  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      lateMinutes,
      overtimeMinutes,
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
      shift: true,
    },
  });

  auditAsync(
    attendance.userId,
    AuditAction.ATTENDANCE_UPDATED,
    AuditEntityType.ATTENDANCE,
    updatedAttendance.id,
    {
      checkIn: updatedAttendance.checkIn,
      checkOut: updatedAttendance.checkOut,
      lateMinutes: updatedAttendance.lateMinutes,
      overtimeMinutes: updatedAttendance.overtimeMinutes,
    },
  );

  return { status: 200, data: updatedAttendance };
};
