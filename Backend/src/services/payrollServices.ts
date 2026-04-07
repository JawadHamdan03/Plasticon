import { prisma } from "../config/lib/prisma";
import { NotificationType } from "../config/generated/prisma/client";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type CalculatePayrollPayload = {
  userId?: number;
  month?: string; // "YYYY-MM"
  hourlyRate?: number;
  overtimeRate?: number;
};

const parseMonthRange = (month: string): { start: Date; end: Date } | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const mon = Number(match[2]);
  if (mon < 1 || mon > 12) return null;

  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1)); // exclusive upper bound
  return { start, end };
};

export const calculatePayroll = async (
  calculatedById: number,
  payload: CalculatePayrollPayload = {},
): Promise<ServiceResult<unknown>> => {
  const targetUserId = Number(payload.userId);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return {
      status: 400,
      message: "userId is required and must be a positive integer",
    };
  }

  const month = payload.month?.trim();
  if (!month) {
    return { status: 400, message: "month is required (format: YYYY-MM)" };
  }

  const range = parseMonthRange(month);
  if (!range) {
    return {
      status: 400,
      message: "month must be in YYYY-MM format (e.g. 2026-03)",
    };
  }

  const hourlyRate = Number(payload.hourlyRate);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return {
      status: 400,
      message: "hourlyRate must be zero or a positive number",
    };
  }

  const overtimeRate = Number(payload.overtimeRate);
  if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
    return {
      status: 400,
      message: "overtimeRate must be zero or a positive number",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, fullName: true, username: true },
  });

  if (!user) {
    return { status: 404, message: "User not found" };
  }

  const existing = await prisma.payroll.findFirst({
    where: { userId: targetUserId, month },
  });

  if (existing) {
    return {
      status: 409,
      message: `Payroll for ${user.fullName} (${month}) already exists`,
    };
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      checkIn: { gte: range.start, lt: range.end },
      checkOut: { not: null },
    },
  });

  if (attendances.length === 0) {
    return {
      status: 400,
      message: `No completed attendance records found for ${user.fullName} in ${month}`,
    };
  }

  let totalMinutes = 0;
  let totalOvertimeMinutes = 0;

  for (const att of attendances) {
    const checkOut = att.checkOut as Date;
    const durationMinutes = Math.floor(
      (checkOut.getTime() - att.checkIn.getTime()) / 60000,
    );
    totalMinutes += durationMinutes;
    totalOvertimeMinutes += att.overtimeMinutes;
  }

  const totalHours = parseFloat((totalMinutes / 60).toFixed(4));
  const overtimeHours = parseFloat((totalOvertimeMinutes / 60).toFixed(4));
  const regularHours = parseFloat((totalHours - overtimeHours).toFixed(4));

  const baseSalary = parseFloat((regularHours * hourlyRate).toFixed(2));
  const overtimeSalary = parseFloat((overtimeHours * overtimeRate).toFixed(2));
  const totalSalary = parseFloat((baseSalary + overtimeSalary).toFixed(2));

  const payroll = await prisma.payroll.create({
    data: {
      userId: targetUserId,
      month,
      totalHours,
      overtimeHours,
      baseSalary,
      overtimeSalary,
      totalSalary,
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
  });

  auditAsync(
    calculatedById,
    AuditAction.PAYROLL_CREATED,
    AuditEntityType.PAYROLL,
    payroll.id,
    {
      targetUserId,
      month,
      totalHours,
      totalSalary,
    },
  );

  const createdNotification = await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: "Payroll ready",
      message: `Your payroll for ${month} is ready. Total salary: ${totalSalary}`,
      type: NotificationType.PAYROLL_READY,
    },
  });

  emitNotificationToUser(targetUserId, createdNotification);
  emitNotificationUnreadCountUpdate(targetUserId, { refresh: true });

  return { status: 201, data: payroll };
};

export const getAllPayrolls = async (): Promise<ServiceResult<unknown>> => {
  const payrolls = await prisma.payroll.findMany({
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: [{ month: "desc" }, { calculatedAt: "desc" }],
  });

  return { status: 200, data: payrolls };
};

export const getMyPayrolls = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const payrolls = await prisma.payroll.findMany({
    where: { userId },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: { month: "desc" },
  });

  return { status: 200, data: payrolls };
};

export const getPayrollById = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
  });

  if (!payroll) {
    return { status: 404, message: "Payroll record not found" };
  }

  return { status: 200, data: payroll };
};

export const deletePayroll = async (
  id: number,
  deletedById: number,
): Promise<ServiceResult<{ message: string }>> => {
  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true } },
    },
  });

  if (!payroll) {
    return { status: 404, message: "Payroll record not found" };
  }

  await prisma.payroll.delete({ where: { id } });

  auditAsync(
    deletedById,
    AuditAction.PAYROLL_DELETED,
    AuditEntityType.PAYROLL,
    id,
    {
      userId: payroll.userId,
      month: payroll.month,
      totalSalary: payroll.totalSalary,
    },
  );

  return { status: 200, data: { message: "Payroll record deleted" } };
};

export const updatePayroll = async (
  id: number,
  payload: {
    month?: string;
    totalHours?: number;
    overtimeHours?: number;
    baseSalary?: number;
    overtimeSalary?: number;
    totalSalary?: number;
  },
  updatedById: number,
): Promise<ServiceResult<unknown>> => {
  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
  });

  if (!payroll) {
    return { status: 404, message: "Payroll record not found" };
  }

  const nextMonth = payload.month?.trim() || payroll.month;
  if (payload.month !== undefined && !/^\d{4}-\d{2}$/.test(nextMonth)) {
    return { status: 400, message: "month must be in YYYY-MM format" };
  }

  const numericFields = [
    ["totalHours", payload.totalHours],
    ["overtimeHours", payload.overtimeHours],
    ["baseSalary", payload.baseSalary],
    ["overtimeSalary", payload.overtimeSalary],
    ["totalSalary", payload.totalSalary],
  ] as const;

  for (const [field, value] of numericFields) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      return {
        status: 400,
        message: `${field} must be zero or a positive number`,
      };
    }
  }

  const updatedPayroll = await prisma.payroll.update({
    where: { id },
    data: {
      month: nextMonth,
      ...(payload.totalHours !== undefined && {
        totalHours: payload.totalHours,
      }),
      ...(payload.overtimeHours !== undefined && {
        overtimeHours: payload.overtimeHours,
      }),
      ...(payload.baseSalary !== undefined && {
        baseSalary: payload.baseSalary,
      }),
      ...(payload.overtimeSalary !== undefined && {
        overtimeSalary: payload.overtimeSalary,
      }),
      ...(payload.totalSalary !== undefined && {
        totalSalary: payload.totalSalary,
      }),
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
  });

  auditAsync(
    updatedById,
    AuditAction.PAYROLL_UPDATED,
    AuditEntityType.PAYROLL,
    updatedPayroll.id,
    {
      before: {
        month: payroll.month,
        totalHours: payroll.totalHours,
        overtimeHours: payroll.overtimeHours,
        baseSalary: payroll.baseSalary,
        overtimeSalary: payroll.overtimeSalary,
        totalSalary: payroll.totalSalary,
      },
      after: {
        month: updatedPayroll.month,
        totalHours: updatedPayroll.totalHours,
        overtimeHours: updatedPayroll.overtimeHours,
        baseSalary: updatedPayroll.baseSalary,
        overtimeSalary: updatedPayroll.overtimeSalary,
        totalSalary: updatedPayroll.totalSalary,
      },
    },
  );

  return { status: 200, data: updatedPayroll };
};

export const getPayrollAdminOverview = async (): Promise<
  ServiceResult<unknown>
> => {
  const payrolls = await prisma.payroll.findMany({
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: [{ month: "desc" }, { calculatedAt: "desc" }],
  });

  const totals = {
    payrollCount: payrolls.length,
    totalBaseSalary: payrolls.reduce(
      (sum, item) => sum + (item.baseSalary ?? 0),
      0,
    ),
    totalOvertimeSalary: payrolls.reduce(
      (sum, item) => sum + (item.overtimeSalary ?? 0),
      0,
    ),
    totalPayout: payrolls.reduce(
      (sum, item) => sum + (item.totalSalary ?? 0),
      0,
    ),
  };

  const byRoleMap = new Map<
    string,
    { role: string; payrollCount: number; totalPayout: number }
  >();
  const byUserMap = new Map<
    number,
    {
      userId: number;
      fullName: string;
      username: string;
      role: string;
      payrollCount: number;
      totalPayout: number;
    }
  >();
  const byMonthMap = new Map<
    string,
    { month: string; payrollCount: number; totalPayout: number }
  >();

  for (const payroll of payrolls) {
    const roleKey = payroll.user.role;
    const roleCurrent = byRoleMap.get(roleKey) ?? {
      role: roleKey,
      payrollCount: 0,
      totalPayout: 0,
    };
    roleCurrent.payrollCount += 1;
    roleCurrent.totalPayout += payroll.totalSalary ?? 0;
    byRoleMap.set(roleKey, roleCurrent);

    const userCurrent = byUserMap.get(payroll.user.id) ?? {
      userId: payroll.user.id,
      fullName: payroll.user.fullName,
      username: payroll.user.username,
      role: payroll.user.role,
      payrollCount: 0,
      totalPayout: 0,
    };
    userCurrent.payrollCount += 1;
    userCurrent.totalPayout += payroll.totalSalary ?? 0;
    byUserMap.set(payroll.user.id, userCurrent);

    const monthCurrent = byMonthMap.get(payroll.month) ?? {
      month: payroll.month,
      payrollCount: 0,
      totalPayout: 0,
    };
    monthCurrent.payrollCount += 1;
    monthCurrent.totalPayout += payroll.totalSalary ?? 0;
    byMonthMap.set(payroll.month, monthCurrent);
  }

  return {
    status: 200,
    data: {
      totals,
      byRole: Array.from(byRoleMap.values()).sort(
        (a, b) => b.totalPayout - a.totalPayout,
      ),
      byUser: Array.from(byUserMap.values()).sort(
        (a, b) => b.totalPayout - a.totalPayout,
      ),
      byMonth: Array.from(byMonthMap.values()).sort((a, b) =>
        b.month.localeCompare(a.month),
      ),
      recentPayrolls: payrolls.slice(0, 25),
    },
  };
};
