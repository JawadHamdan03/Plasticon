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

type CreateMaintenancePayload = {
    machineId?: number;
    shiftId?: number;
    partsUsed?: string;
    downtimeMinutes?: number;
    reportText?: string;
    imagePath?: string;
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

export const createMaintenance = async (
    engineerId: number,
    payload: CreateMaintenancePayload
): Promise<ServiceResult<unknown>> => {
    const machineId = Number(payload.machineId);

    if (!Number.isInteger(machineId) || machineId <= 0) {
        return { status: 400, message: "machineId is required and must be a positive integer" };
    }

    const partsUsed = payload.partsUsed?.trim();
    if (!partsUsed) {
        return { status: 400, message: "partsUsed is required" };
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

    const downtimeMinutes = asNonNegativeNumber(payload.downtimeMinutes);
    if (
        payload.downtimeMinutes !== undefined &&
        payload.downtimeMinutes !== null &&
        downtimeMinutes === null
    ) {
        return { status: 400, message: "downtimeMinutes must be zero or a positive number" };
    }

    const maintenance = await prisma.maintenance.create({
        data: {
            machineId: machine.id,
            engineerId,
            shiftId: Number(resolvedShiftId),
            partsUsed,
            downtimeMinutes,
            reportText: payload.reportText?.trim() || null,
            imagePath: payload.imagePath?.trim() || null,
        },
        include: {
            machine: { select: { id: true, name: true, type: true } },
            shift: true,
        },
    });

    auditAsync(engineerId, AuditAction.MAINTENANCE_CREATED, AuditEntityType.MAINTENANCE, maintenance.id, {
        machineId: machine.id,
        machineName: machine.name,
    });

    if ((downtimeMinutes ?? 0) >= 60) {
        const adminUsers = await prisma.user.findMany({
            where: { role: UserRole.ADMIN },
            select: { id: true },
        });

        if (adminUsers.length > 0) {
            await prisma.notification.createMany({
                data: adminUsers.map((admin) => ({
                    userId: admin.id,
                    title: "Urgent maintenance alert",
                    message: `${machine.name} has high downtime (${downtimeMinutes} minutes).`,
                    type: NotificationType.MAINTENANCE_URGENT,
                    machineId: machine.id,
                })),
            });

            adminUsers.forEach((admin) => {
                emitNotificationUnreadCountUpdate(admin.id, { refresh: true });
            });
        }
    }

    return { status: 201, data: maintenance };
};

export const getMyMaintenances = async (engineerId: number): Promise<ServiceResult<unknown>> => {
    const records = await prisma.maintenance.findMany({
        where: { engineerId },
        include: {
            machine: { select: { id: true, name: true, type: true } },
            shift: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return { status: 200, data: records };
};

export const getAllMaintenances = async (): Promise<ServiceResult<unknown>> => {
    const records = await prisma.maintenance.findMany({
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
