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
  annualIncreasePct?: number;
  bonusAmount?: number;
};

const ROLE_BASE_MONTHLY_SALARY: Record<string, number> = {
  WORKER: 2500,
  ENGINEER: 3000,
  ACCOUNTANT: 2800,
};

const WORK_DAYS_PER_MONTH = 26;
const HOURS_PER_WORK_DAY = 8;

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

  const annualIncreasePct = Number(payload.annualIncreasePct ?? 0);
  if (!Number.isFinite(annualIncreasePct) || annualIncreasePct < 0) {
    return {
      status: 400,
      message: "annualIncreasePct must be zero or a positive number",
    };
  }

  const bonusAmount = Number(payload.bonusAmount ?? 0);
  if (!Number.isFinite(bonusAmount) || bonusAmount < 0) {
    return {
      status: 400,
      message: "bonusAmount must be zero or a positive number",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, fullName: true, username: true, role: true, monthlySalary: true },
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
      leaveType: null, // exclude leave days from hours calculation
    },
  });

  if (attendances.length === 0) {
    return {
      status: 400,
      message: `No completed attendance records found for ${user.fullName} in ${month}`,
    };
  }

  const hasHourlyRateInput = payload.hourlyRate !== undefined;
  const hasOvertimeRateInput = payload.overtimeRate !== undefined;

  // Use individual salary override if set, otherwise fall back to SalaryConfig then hardcoded defaults
  const salaryConfig = await prisma.salaryConfig.findUnique({ where: { role: user.role } });
  const baseMonthlySalary = user.monthlySalary ?? salaryConfig?.monthlySalary ?? ROLE_BASE_MONTHLY_SALARY[user.role] ?? 0;
  const roleDailyRate =
    baseMonthlySalary > 0 ? baseMonthlySalary / WORK_DAYS_PER_MONTH : 0;
  const roleHourlyRate = roleDailyRate / HOURS_PER_WORK_DAY;

  const hourlyRate = hasHourlyRateInput
    ? Number(payload.hourlyRate)
    : roleHourlyRate;
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return {
      status: 400,
      message: "hourlyRate must be zero or a positive number",
    };
  }

  const overtimeRate = hasOvertimeRateInput
    ? Number(payload.overtimeRate)
    : hourlyRate * 1.5;
  if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
    return {
      status: 400,
      message: "overtimeRate must be zero or a positive number",
    };
  }

  let totalMinutes = 0;
  let totalOvertimeMinutes = 0;
  let weightedWorkedDays = 0;

  for (const att of attendances) {
    const checkOut = att.checkOut as Date;
    const durationMinutes = Math.floor(
      (checkOut.getTime() - att.checkIn.getTime()) / 60000,
    );
    totalMinutes += durationMinutes;
    totalOvertimeMinutes += att.overtimeMinutes;

    const checkInDay = new Date(att.checkIn).getDay();
    weightedWorkedDays += checkInDay === 5 ? 1.5 : 1;
  }

  const totalHours = parseFloat((totalMinutes / 60).toFixed(4));
  const overtimeHours = parseFloat((totalOvertimeMinutes / 60).toFixed(4));
  const regularHours = parseFloat((totalHours - overtimeHours).toFixed(4));

  const roleBasedSalary = parseFloat(
    (weightedWorkedDays * roleDailyRate).toFixed(2),
  );
  const hourlyBasedSalary = parseFloat((regularHours * hourlyRate).toFixed(2));
  const baseSalaryBeforeIncrease =
    baseMonthlySalary > 0 && !hasHourlyRateInput
      ? roleBasedSalary
      : hourlyBasedSalary;
  const baseSalary = parseFloat(
    (baseSalaryBeforeIncrease * (1 + annualIncreasePct / 100)).toFixed(2),
  );
  const overtimeSalary = parseFloat((overtimeHours * overtimeRate).toFixed(2));
  const totalSalary = parseFloat(
    (baseSalary + overtimeSalary + bonusAmount).toFixed(2),
  );

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
      annualIncreasePct,
      bonusAmount,
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

/* ─── Salary Config ─────────────────────────────────────── */

export const getSalaryConfigs = async (): Promise<ServiceResult<unknown>> => {
  const configs = await prisma.salaryConfig.findMany({
    include: { updatedBy: { select: { id: true, fullName: true } } },
    orderBy: { role: "asc" },
  });
  return { status: 200, data: configs };
};

export const updateSalaryConfig = async (
  role: string,
  monthlySalary: number,
  updatedById: number,
): Promise<ServiceResult<unknown>> => {
  const validRoles = ["WORKER", "ENGINEER", "ACCOUNTANT", "ADMIN"];
  if (!validRoles.includes(role)) {
    return { status: 400, message: "Invalid role. Must be WORKER, ENGINEER, ACCOUNTANT, or ADMIN" };
  }
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    return { status: 400, message: "monthlySalary must be a non-negative number" };
  }

  const config = await prisma.salaryConfig.upsert({
    where: { role: role as any },
    update: { monthlySalary, updatedById },
    create: { role: role as any, monthlySalary, updatedById },
  });

  return { status: 200, data: config };
};

/* ─── Daily Payroll ─────────────────────────────────────── */

const DAYS_IN_MONTH = 30;

async function getEffectiveMonthlySalary(userId: number, role: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { monthlySalary: true } });
  if (user?.monthlySalary != null) return user.monthlySalary;
  const config = await prisma.salaryConfig.findUnique({ where: { role: role as any } });
  if (config) return config.monthlySalary;
  const fallback: Record<string, number> = { WORKER: 2500, ENGINEER: 3500, ACCOUNTANT: 3000, ADMIN: 5000 };
  return fallback[role] ?? 2500;
}

export const calculateDailyPayroll = async (
  attendanceId: number,
  calculatedById: number,
): Promise<ServiceResult<unknown>> => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      shift: { select: { startTime: true, endTime: true } },
    },
  });

  if (!attendance) return { status: 404, message: "Attendance record not found" };
  if (!attendance.checkOut) return { status: 400, message: "Employee has not checked out yet" };

  const existing = await prisma.dailyPayroll.findUnique({ where: { attendanceId } });
  if (existing) return { status: 409, message: "Daily payroll already calculated for this attendance" };

  const monthlySalary = await getEffectiveMonthlySalary(attendance.user.id, attendance.user.role);
  const dailyRate = monthlySalary / DAYS_IN_MONTH;

  const durationMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
  const hoursWorked = parseFloat((durationMs / 3600000).toFixed(4));

  let shiftHours = 8;
  let shiftStartMs: number | null = null;
  let shiftEndMs: number | null = null;
  if (attendance.shift) {
    const s = attendance.shift.startTime;
    const e = attendance.shift.endTime;
    const diff = (e.getTime() - s.getTime()) / 3600000;
    if (diff > 0) {
      shiftHours = diff;
      shiftStartMs = s.getTime();
      shiftEndMs = e.getTime();
    }
  }

  const hourlyRate = dailyRate / shiftHours;

  // ── Apply deduction rules ──────────────────────────────────────
  const rules = await prisma.deductionRule.findMany({ where: { isActive: true } });
  const ruleMap = new Map(rules.map((r) => [r.type, r]));

  let basePay: number;
  let deductionAmount = 0;
  const deductionParts: string[] = [];

  const leaveType = attendance.leaveType;

  if (leaveType === "UNPAID") {
    // Unpaid leave — zero pay
    basePay = 0;
    deductionAmount = dailyRate;
    deductionParts.push("Unpaid leave: full day deducted");
  } else if (leaveType === "ANNUAL") {
    // Annual leave — full day pay regardless of hours
    basePay = dailyRate;
  } else if (leaveType === "SICK") {
    const sickRule = ruleMap.get("SICK_LEAVE");
    if (sickRule) {
      const payRate = Math.min(100, Math.max(0, sickRule.deductionValue)) / 100;
      basePay = parseFloat((dailyRate * payRate).toFixed(2));
      deductionAmount = parseFloat((dailyRate - basePay).toFixed(2));
      deductionParts.push(`Sick leave: ${sickRule.deductionValue}% pay rate`);
    } else {
      basePay = parseFloat((hoursWorked * hourlyRate).toFixed(2));
    }
  } else {
    // Normal work day — start with hours-based pay
    basePay = parseFloat((hoursWorked * hourlyRate).toFixed(2));

    // LATE_ARRIVAL rule
    const lateRule = ruleMap.get("LATE_ARRIVAL");
    if (lateRule && shiftStartMs !== null) {
      const checkInMs = attendance.checkIn.getTime();
      const lateMs = checkInMs - shiftStartMs;
      const lateMinutes = lateMs / 60000;
      if (lateMinutes > lateRule.thresholdMinutes) {
        const lateHours = lateMinutes / 60;
        const lateDeduction = parseFloat((lateHours * lateRule.deductionValue).toFixed(2));
        deductionAmount += lateDeduction;
        deductionParts.push(`Late arrival ${Math.round(lateMinutes)}min: -${lateDeduction} NIS`);
      }
    }

    // EARLY_CHECKOUT rule
    const earlyRule = ruleMap.get("EARLY_CHECKOUT");
    if (earlyRule && shiftEndMs !== null) {
      const checkOutMs = (attendance.checkOut as Date).getTime();
      const earlyMs = shiftEndMs - checkOutMs;
      const earlyMinutes = earlyMs / 60000;
      if (earlyMinutes > earlyRule.thresholdMinutes) {
        const missedHours = earlyMinutes / 60;
        const earlyDeduction = parseFloat((missedHours * hourlyRate).toFixed(2));
        deductionAmount += earlyDeduction;
        deductionParts.push(`Early checkout ${Math.round(earlyMinutes)}min: -${earlyDeduction} NIS`);
      }
    }
  }

  const totalDailyPay = parseFloat(Math.max(0, basePay - deductionAmount).toFixed(2));
  const deductionNotes = deductionParts.length > 0 ? deductionParts.join("; ") : null;

  const record = await prisma.dailyPayroll.create({
    data: {
      userId: attendance.user.id,
      attendanceId,
      date: attendance.checkIn,
      hoursWorked,
      dailyRate,
      totalDailyPay,
      deductionAmount: parseFloat(deductionAmount.toFixed(2)),
      deductionNotes,
    },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      attendance: { select: { id: true, checkIn: true, checkOut: true } },
    },
  });

  return { status: 201, data: record };
};

export const confirmDailyPayroll = async (
  id: number,
  confirmedById: number,
): Promise<ServiceResult<unknown>> => {
  const record = await prisma.dailyPayroll.findUnique({
    where: { id },
    include: { user: { select: { id: true, fullName: true, role: true } } },
  });

  if (!record) return { status: 404, message: "Daily payroll record not found" };
  if (record.isConfirmed) return { status: 409, message: "Already confirmed" };

  const updated = await prisma.dailyPayroll.update({
    where: { id },
    data: { isConfirmed: true, confirmedById, confirmedAt: new Date() },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      attendance: { select: { id: true, checkIn: true, checkOut: true } },
    },
  });

  // Notify the worker
  const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(record.date);
  const notification = await prisma.notification.create({
    data: {
      userId: record.userId,
      title: "Daily salary confirmed",
      message: `Your salary for ${dateLabel} has been confirmed: ${record.totalDailyPay.toFixed(2)} NIS`,
      type: NotificationType.PAYROLL_READY,
    },
  });

  emitNotificationToUser(record.userId, notification);
  emitNotificationUnreadCountUpdate(record.userId, { refresh: true });

  await prisma.dailyPayroll.update({ where: { id }, data: { notificationSent: true } });

  auditAsync(confirmedById, AuditAction.PAYROLL_UPDATED, AuditEntityType.PAYROLL, id, {
    action: "CONFIRM_DAILY",
    targetUserId: record.userId,
    date: record.date,
    totalDailyPay: record.totalDailyPay,
  });

  return { status: 200, data: updated };
};

export const getDailyPayrollsForAccountant = async (
  dateStr?: string,
): Promise<ServiceResult<unknown>> => {
  const whereDate: any = {};
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const end = new Date(start.getTime() + 86400000);
      whereDate.date = { gte: start, lt: end };
    }
  }

  const records = await prisma.dailyPayroll.findMany({
    where: whereDate,
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      attendance: { select: { id: true, checkIn: true, checkOut: true } },
      confirmedBy: { select: { id: true, fullName: true } },
    },
    orderBy: [{ date: "desc" }, { userId: "asc" }],
  });

  return { status: 200, data: records };
};

export const calculateDailyPayrollsForDate = async (
  dateStr: string,
  calculatedById: number,
): Promise<ServiceResult<unknown>> => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { status: 400, message: "date must be a valid date string" };
  }

  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const end = new Date(start.getTime() + 86400000);

  const attendances = await prisma.attendance.findMany({
    where: {
      checkIn: { gte: start, lt: end },
      checkOut: { not: null },
      dailyPayroll: null,
    },
    select: { id: true },
  });

  if (attendances.length === 0) {
    return { status: 200, data: { calculated: 0, message: "No new attendance records to process" } };
  }

  let calculated = 0;
  let skipped = 0;
  for (const att of attendances) {
    try {
      const result = await calculateDailyPayroll(att.id, calculatedById);
      if (result.status === 201) calculated++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return {
    status: 200,
    data: { calculated, skipped, message: `Calculated ${calculated} payroll record(s)` },
  };
};

export const getMyDailyPayrolls = async (
  userId: number,
  month?: string,
): Promise<ServiceResult<unknown>> => {
  const where: any = { userId };

  if (month) {
    const range = parseMonthRange(month);
    if (range) where.date = { gte: range.start, lt: range.end };
  }

  const records = await prisma.dailyPayroll.findMany({
    where,
    include: {
      attendance: { select: { id: true, checkIn: true, checkOut: true } },
    },
    orderBy: { date: "desc" },
  });

  const total = records.filter(r => r.isConfirmed).reduce((s, r) => s + r.totalDailyPay, 0);

  return { status: 200, data: { records, confirmedTotal: parseFloat(total.toFixed(2)) } };
};

// ── Per-user salary management ──────────────────────────────────

export const getUserSalaries = async (): Promise<ServiceResult<unknown>> => {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, fullName: true, role: true, monthlySalary: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  const configs = await prisma.salaryConfig.findMany();
  const configMap = new Map(configs.map((c) => [c.role as string, c.monthlySalary]));

  const data = users.map((u) => {
    const roleDefault = configMap.get(u.role) ?? ROLE_BASE_MONTHLY_SALARY[u.role] ?? 0;
    return {
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      roleDefaultSalary: roleDefault,
      individualSalary: u.monthlySalary ?? null,
      effectiveSalary: u.monthlySalary ?? roleDefault,
    };
  });

  return { status: 200, data };
};

export const setUserMonthlySalary = async (
  userId: number,
  monthlySalary: number | null,
  adminId: number,
): Promise<ServiceResult<unknown>> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { status: 404, message: "User not found" };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { monthlySalary },
    select: { id: true, fullName: true, role: true, monthlySalary: true },
  });

  auditAsync(adminId, AuditAction.USER_UPDATED, AuditEntityType.USER, userId, {
    field: "monthlySalary",
    before: user.monthlySalary,
    after: monthlySalary,
  });

  return { status: 200, data: updated };
};

// ── Deduction Rules ──────────────────────────────────────────────

const VALID_RULE_TYPES = ["LATE_ARRIVAL", "EARLY_CHECKOUT", "UNEXCUSED_ABSENCE", "SICK_LEAVE"] as const;

export const getDeductionRules = async (): Promise<ServiceResult<unknown>> => {
  // Ensure all 4 rule rows exist (upsert defaults if missing)
  const existing = await prisma.deductionRule.findMany();
  const existingTypes = new Set(existing.map((r) => r.type));
  const defaults: Record<string, { thresholdMinutes: number; deductionValue: number }> = {
    LATE_ARRIVAL:       { thresholdMinutes: 15, deductionValue: 5 },
    EARLY_CHECKOUT:     { thresholdMinutes: 60, deductionValue: 0 },
    UNEXCUSED_ABSENCE:  { thresholdMinutes: 0,  deductionValue: 0 },
    SICK_LEAVE:         { thresholdMinutes: 0,  deductionValue: 75 },
  };
  for (const type of VALID_RULE_TYPES) {
    if (!existingTypes.has(type)) {
      await prisma.deductionRule.create({ data: { type, ...defaults[type] } });
    }
  }

  const rules = await prisma.deductionRule.findMany({ orderBy: { type: "asc" } });
  return { status: 200, data: rules };
};

export const updateDeductionRule = async (
  type: string,
  payload: { isActive?: boolean; thresholdMinutes?: number; deductionValue?: number },
  adminId: number,
): Promise<ServiceResult<unknown>> => {
  if (!VALID_RULE_TYPES.includes(type as any)) {
    return { status: 400, message: `type must be one of: ${VALID_RULE_TYPES.join(", ")}` };
  }
  if (payload.thresholdMinutes !== undefined && (payload.thresholdMinutes < 0 || !Number.isInteger(payload.thresholdMinutes))) {
    return { status: 400, message: "thresholdMinutes must be a non-negative integer" };
  }
  if (payload.deductionValue !== undefined && (!Number.isFinite(payload.deductionValue) || payload.deductionValue < 0)) {
    return { status: 400, message: "deductionValue must be a non-negative number" };
  }
  if (type === "SICK_LEAVE" && payload.deductionValue !== undefined && payload.deductionValue > 100) {
    return { status: 400, message: "deductionValue for SICK_LEAVE is a pay-rate % (0–100)" };
  }

  const rule = await prisma.deductionRule.upsert({
    where: { type },
    update: { ...payload, updatedById: adminId },
    create: { type, isActive: payload.isActive ?? false, thresholdMinutes: payload.thresholdMinutes ?? 15, deductionValue: payload.deductionValue ?? 0, updatedById: adminId },
  });

  auditAsync(adminId, AuditAction.USER_UPDATED, AuditEntityType.USER, rule.id, { type, changes: payload });

  return { status: 200, data: rule };
};

// ── Attendance leave marking ─────────────────────────────────────

export const markAttendanceLeave = async (
  attendanceId: number,
  leaveType: string | null,
  adminId: number,
): Promise<ServiceResult<unknown>> => {
  const att = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!att) return { status: 404, message: "Attendance record not found" };

  const validTypes = ["SICK", "ANNUAL", "UNPAID", null];
  if (leaveType !== null && !validTypes.includes(leaveType)) {
    return { status: 400, message: "leaveType must be SICK, ANNUAL, UNPAID, or null" };
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: { leaveType },
  });

  auditAsync(adminId, AuditAction.ATTENDANCE_UPDATED, AuditEntityType.ATTENDANCE, attendanceId, {
    userId: att.userId,
    leaveTypeBefore: att.leaveType,
    leaveTypeAfter: leaveType,
  });

  return { status: 200, data: updated };
};

export const calculateMonthlyPayrollForAll = async (
  calculatedById: number,
  month: string,
): Promise<ServiceResult<{ calculated: number; skipped: number; errors: string[] }>> => {
  if (!month?.match(/^\d{4}-\d{2}$/)) {
    return { status: 400, message: "month must be in YYYY-MM format" };
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true, role: { not: "ADMIN" } },
    select: { id: true, fullName: true },
  });

  let calculated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const result = await calculatePayroll(calculatedById, { userId: user.id, month });
    if (result.status === 201) {
      calculated++;
    } else if (result.status === 409) {
      skipped++;
    } else {
      errors.push(`${user.fullName}: ${result.message ?? "unknown error"}`);
    }
  }

  return { status: 200, data: { calculated, skipped, errors } };
};
