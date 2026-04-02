import { prisma } from "../config/lib/prisma";
import { NotificationType, UserRole } from "../config/generated/prisma/client";
import { emitNotificationUnreadCountUpdate } from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

type CreateQualityCheckPayload = {
    machineId?: number;
    shiftId?: number;
    capsStatus?: string;
    preformStatus?: string;
    notes?: string;
};

export const createQualityCheck = async (
    engineerId: number,
    payload: CreateQualityCheckPayload
): Promise<ServiceResult<unknown>> => {
    const machineId = Number(payload.machineId);

    if (!Number.isInteger(machineId) || machineId <= 0) {
        return { status: 400, message: "machineId is required and must be a positive integer" };
    }

    const user = await prisma.user.findUnique({
        where: { id: engineerId },
        select: { id: true, shiftId: true },
    });

    if (!user) {
        return { status: 404, message: "User not found" };
    }

    const machine = await prisma.machine.findUnique({
        where: { id: machineId },
        select: { id: true, name: true, type: true },
    });

    if (!machine) {
        return { status: 404, message: "Machine not found" };
    }

    const resolvedShiftId = payload.shiftId ?? user.shiftId;
    if (!resolvedShiftId) {
        return { status: 400, message: "shiftId is required when user has no assigned shift" };
    }

    const shift = await prisma.shift.findUnique({ where: { id: Number(resolvedShiftId) } });
    if (!shift) {
        return { status: 404, message: "Shift not found" };
    }

    const capsStatus = payload.capsStatus?.trim() || null;
    const preformStatus = payload.preformStatus?.trim() || null;
    const notes = payload.notes?.trim() || null;

    if (!capsStatus && !preformStatus && !notes) {
        return { status: 400, message: "At least one of capsStatus, preformStatus, or notes is required" };
    }

    const qualityCheck = await prisma.qualityCheck.create({
        data: {
            machineId: machine.id,
            engineerId,
            shiftId: Number(resolvedShiftId),
            capsStatus,
            preformStatus,
            notes,
        },
        include: {
            machine: { select: { id: true, name: true, type: true } },
            shift: true,
        },
    });

    auditAsync(engineerId, AuditAction.QUALITY_CHECK_CREATED, AuditEntityType.QUALITY_CHECK, qualityCheck.id, {
        machineId: machine.id,
        machineName: machine.name,
    });

    const hasFailure =
        String(qualityCheck.capsStatus) === "FAIL" || String(qualityCheck.preformStatus) === "FAIL";

    if (hasFailure) {
        const adminUsers = await prisma.user.findMany({
            where: { role: UserRole.ADMIN },
            select: { id: true },
        });

        if (adminUsers.length > 0) {
            await prisma.notification.createMany({
                data: adminUsers.map((admin) => ({
                    userId: admin.id,
                    title: "Quality issue detected",
                    message: `A failed quality check was recorded on ${machine.name}.`,
                    type: NotificationType.QUALITY_ISSUE,
                    machineId: machine.id,
                })),
            });

            adminUsers.forEach((admin) => {
                emitNotificationUnreadCountUpdate(admin.id, { refresh: true });
            });
        }
    }

    return { status: 201, data: qualityCheck };
};

export const getMyQualityChecks = async (engineerId: number): Promise<ServiceResult<unknown>> => {
    const records = await prisma.qualityCheck.findMany({
        where: { engineerId },
        include: {
            machine: { select: { id: true, name: true, type: true } },
            shift: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return { status: 200, data: records };
};

export const getAllQualityChecks = async (): Promise<ServiceResult<unknown>> => {
    const records = await prisma.qualityCheck.findMany({
        include: {
            engineer: {
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
