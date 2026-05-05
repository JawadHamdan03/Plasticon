import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const getAllMaintenanceCosts = async (): Promise<ServiceResult<unknown>> => {
    const records = await prisma.maintenanceCost.findMany({
        include: {
            maintenance: {
                include: {
                    machine: { select: { id: true, name: true, type: true } },
                    engineer: { select: { id: true, fullName: true } },
                },
            },
            createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return { status: 200, data: records };
};

export const getCostsByMachine = async (machineId: number): Promise<ServiceResult<unknown>> => {
    const mid = Number(machineId);
    if (!Number.isInteger(mid) || mid <= 0) {
        return { status: 400, message: "Invalid machineId" };
    }

    const machine = await prisma.machine.findUnique({ where: { id: mid }, select: { id: true, name: true, type: true } });
    if (!machine) {
        return { status: 404, message: "Machine not found" };
    }

    const costs = await prisma.maintenanceCost.findMany({
        where: {
            maintenance: { machineId: mid },
        },
        include: {
            maintenance: {
                include: {
                    machine: { select: { id: true, name: true, type: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
    const totalLaborHours = costs.reduce((sum, c) => sum + c.laborHours, 0);
    const totalSpares = costs.reduce((sum, c) => sum + c.sparesTotal, 0);

    return {
        status: 200,
        data: {
            machine,
            summary: {
                recordCount: costs.length,
                totalCost,
                totalLaborHours,
                totalSpares,
            },
            records: costs,
        },
    };
};

export const createMaintenanceCost = async (
    createdById: number,
    payload: {
        maintenanceId: number;
        laborHours: number;
        laborCostPerHour: number;
        sparesTotal: number;
        notes?: string;
    }
): Promise<ServiceResult<unknown>> => {
    const maintenanceId = Number(payload.maintenanceId);
    if (!Number.isInteger(maintenanceId) || maintenanceId <= 0) {
        return { status: 400, message: "Invalid maintenanceId" };
    }

    const laborHours = Number(payload.laborHours);
    const laborCostPerHour = Number(payload.laborCostPerHour);
    const sparesTotal = Number(payload.sparesTotal);

    if (!Number.isFinite(laborHours) || laborHours < 0) {
        return { status: 400, message: "laborHours must be a non-negative number" };
    }
    if (!Number.isFinite(laborCostPerHour) || laborCostPerHour < 0) {
        return { status: 400, message: "laborCostPerHour must be a non-negative number" };
    }
    if (!Number.isFinite(sparesTotal) || sparesTotal < 0) {
        return { status: 400, message: "sparesTotal must be a non-negative number" };
    }

    const maintenance = await prisma.maintenance.findUnique({ where: { id: maintenanceId } });
    if (!maintenance) {
        return { status: 404, message: "Maintenance record not found" };
    }

    const laborTotal = laborHours * laborCostPerHour;
    const totalCost = sparesTotal + laborTotal;

    const record = await prisma.maintenanceCost.create({
        data: {
            maintenanceId,
            createdById,
            laborHours,
            laborCostPerHour,
            sparesTotal,
            laborTotal: Math.round(laborTotal * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            notes: payload.notes?.trim() || null,
        },
        include: {
            maintenance: {
                include: {
                    machine: { select: { id: true, name: true, type: true } },
                },
            },
            createdBy: { select: { id: true, fullName: true } },
        },
    });

    return { status: 201, data: record };
};

export const updateMaintenanceCost = async (
    id: number,
    payload: {
        laborHours?: number;
        laborCostPerHour?: number;
        sparesTotal?: number;
        notes?: string;
    }
): Promise<ServiceResult<unknown>> => {
    const costId = Number(id);
    if (!Number.isInteger(costId) || costId <= 0) {
        return { status: 400, message: "Invalid id" };
    }

    const existing = await prisma.maintenanceCost.findUnique({ where: { id: costId } });
    if (!existing) {
        return { status: 404, message: "Maintenance cost record not found" };
    }

    const laborHours = payload.laborHours !== undefined ? Number(payload.laborHours) : existing.laborHours;
    const laborCostPerHour = payload.laborCostPerHour !== undefined ? Number(payload.laborCostPerHour) : existing.laborCostPerHour;
    const sparesTotal = payload.sparesTotal !== undefined ? Number(payload.sparesTotal) : existing.sparesTotal;

    const laborTotal = laborHours * laborCostPerHour;
    const totalCost = sparesTotal + laborTotal;

    const updated = await prisma.maintenanceCost.update({
        where: { id: costId },
        data: {
            laborHours,
            laborCostPerHour,
            sparesTotal,
            laborTotal: Math.round(laborTotal * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100,
            ...(payload.notes !== undefined && { notes: payload.notes.trim() || null }),
        },
        include: {
            maintenance: {
                include: {
                    machine: { select: { id: true, name: true, type: true } },
                },
            },
            createdBy: { select: { id: true, fullName: true } },
        },
    });

    return { status: 200, data: updated };
};

export const deleteMaintenanceCost = async (id: number): Promise<ServiceResult<unknown>> => {
    const costId = Number(id);
    if (!Number.isInteger(costId) || costId <= 0) {
        return { status: 400, message: "Invalid id" };
    }

    const existing = await prisma.maintenanceCost.findUnique({ where: { id: costId } });
    if (!existing) {
        return { status: 404, message: "Maintenance cost record not found" };
    }

    await prisma.maintenanceCost.delete({ where: { id: costId } });

    return { status: 200, data: { message: "Deleted successfully" } };
};
