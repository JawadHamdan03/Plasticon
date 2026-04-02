import { prisma } from "../config/lib/prisma";
import { NotificationType } from "../config/generated/prisma/client";
import { emitNotificationToUser, emitNotificationUnreadCountUpdate } from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

type CalculatePayrollPayload = {
    userId?: number;
    month?: string;       // "YYYY-MM"
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
    payload: CalculatePayrollPayload = {}
): Promise<ServiceResult<unknown>> => {
    const targetUserId = Number(payload.userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return { status: 400, message: "userId is required and must be a positive integer" };
    }

    const month = payload.month?.trim();
    if (!month) {
        return { status: 400, message: "month is required (format: YYYY-MM)" };
    }

    const range = parseMonthRange(month);
    if (!range) {
        return { status: 400, message: "month must be in YYYY-MM format (e.g. 2026-03)" };
    }

    const hourlyRate = Number(payload.hourlyRate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
        return { status: 400, message: "hourlyRate must be zero or a positive number" };
    }

    const overtimeRate = Number(payload.overtimeRate);
    if (!Number.isFinite(overtimeRate) || overtimeRate < 0) {
        return { status: 400, message: "overtimeRate must be zero or a positive number" };
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
            (checkOut.getTime() - att.checkIn.getTime()) / 60000
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

    auditAsync(calculatedById, AuditAction.PAYROLL_CREATED, AuditEntityType.PAYROLL, payroll.id, {
        targetUserId,
        month,
        totalHours,
        totalSalary,
    });

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

export const getMyPayrolls = async (userId: number): Promise<ServiceResult<unknown>> => {
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

export const getPayrollById = async (id: number): Promise<ServiceResult<unknown>> => {
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
    deletedById: number
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

    auditAsync(deletedById, AuditAction.PAYROLL_DELETED, AuditEntityType.PAYROLL, id, {
        userId: payroll.userId,
        month: payroll.month,
        totalSalary: payroll.totalSalary,
    });

    return { status: 200, data: { message: "Payroll record deleted" } };
};
