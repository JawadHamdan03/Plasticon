import { prisma } from "../config/lib/prisma";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

const LATE_GRACE_MINUTES = 30;
const OVERTIME_GRACE_MINUTES = 30;

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

  return Math.max(
    0,
    minutesBetween(checkOut, shiftEnd) - OVERTIME_GRACE_MINUTES,
  );
};

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

  const existingOpenAttendance = await prisma.attendance.findFirst({
    where: {
      userId,
      checkOut: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingOpenAttendance) {
    return {
      status: 409,
      message: "You already have an open attendance record",
    };
  }

  let shiftId: number | null = user.shiftId ?? null;
  let lateMinutes = 0;

  if (user.shift) {
    const shiftStart = new Date(user.shift.startTime);

    if (now.getTime() < shiftStart.getTime()) {
      return { status: 400, message: "Early check-in is not allowed" };
    }

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayShiftAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        shiftId: user.shift.id,
        checkIn: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (todayShiftAttendance) {
      return {
        status: 409,
        message: "Check-in already recorded for this shift today",
      };
    }

    const minutesLateFromStart = minutesBetween(now, shiftStart);
    lateMinutes = Math.max(0, minutesLateFromStart - LATE_GRACE_MINUTES);
  } else {
    shiftId = null;
    lateMinutes = 0;
  }

  const attendance = await prisma.attendance.create({
    data: {
      userId,
      shiftId,
      checkIn: now,
      lateMinutes,
      overtimeMinutes: 0,
    },
  });

  auditAsync(
    userId,
    AuditAction.ATTENDANCE_CHECKED_IN,
    AuditEntityType.ATTENDANCE,
    attendance.id,
  );

  return { status: 201, data: attendance };
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

  if (openAttendance.shift) {
    const shiftEnd = new Date(openAttendance.shift.endTime);

    if (now.getTime() < shiftEnd.getTime()) {
      return { status: 400, message: "Early check-out is not allowed" };
    }

    const minutesAfterShiftEnd = minutesBetween(now, shiftEnd);
    const overtimeMinutes = Math.max(
      0,
      minutesAfterShiftEnd - OVERTIME_GRACE_MINUTES,
    );

    const attendance = await prisma.attendance.update({
      where: { id: openAttendance.id },
      data: {
        checkOut: now,
        overtimeMinutes,
      },
    });

    auditAsync(
      userId,
      AuditAction.ATTENDANCE_CHECKED_OUT,
      AuditEntityType.ATTENDANCE,
      attendance.id,
    );

    return { status: 200, data: attendance };
  }

  const attendance = await prisma.attendance.update({
    where: { id: openAttendance.id },
    data: {
      checkOut: now,
      overtimeMinutes: 0,
    },
  });

  auditAsync(
    userId,
    AuditAction.ATTENDANCE_CHECKED_OUT,
    AuditEntityType.ATTENDANCE,
    attendance.id,
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
  shiftId?: number;
  userId?: number;
}): Promise<ServiceResult<unknown>> => {
  const where: {
    userId?: number;
    shiftId?: number;
    checkIn?: {
      gte: Date;
      lte: Date;
    };
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
    where.checkIn = {
      gte: start,
      lte: end,
    };
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

export const updateAttendance = async (
  attendanceId: number,
  payload: {
    checkIn?: string | Date;
    checkOut?: string | Date | null;
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
  let lateMinutes = 0;
  let overtimeMinutes = 0;

  if (effectiveShift) {
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
