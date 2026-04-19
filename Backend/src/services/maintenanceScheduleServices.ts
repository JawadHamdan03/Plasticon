import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllMaintenanceSchedules = async (): Promise<ServiceResult<unknown>> => {
  try {
    const schedules = await prisma.maintenanceSchedule.findMany({
      include: {
        machine: { select: { id: true, name: true, type: true } },
        assignedEngineer: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { nextScheduledDate: "asc" },
    });
    return { status: 200, data: schedules };
  } catch (error) {
    console.error("Get all maintenance schedules error:", error);
    return { status: 500, message: "Failed to fetch maintenance schedules" };
  }
};

export const createMaintenanceSchedule = async (
  createdById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { machineId, scheduleType, frequency, nextScheduledDate, assignedEngineerId, description } = payload;

    if (!machineId || !scheduleType || !frequency || !nextScheduledDate) {
      return { status: 400, message: "Missing required fields" };
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!machine) {
      return { status: 404, message: "Machine not found" };
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        machineId,
        createdById,
        scheduleType,
        frequency,
        nextScheduledDate: new Date(nextScheduledDate),
        assignedEngineerId: assignedEngineerId || null,
        description: description || null,
      },
      include: {
        machine: { select: { id: true, name: true, type: true } },
        assignedEngineer: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: schedule };
  } catch (error) {
    console.error("Create maintenance schedule error:", error);
    return { status: 500, message: "Failed to create maintenance schedule" };
  }
};

export const updateMaintenanceSchedule = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!schedule) {
      return { status: 404, message: "Maintenance schedule not found" };
    }

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...(payload.status && { status: payload.status }),
        ...(payload.assignedEngineerId && { assignedEngineerId: payload.assignedEngineerId }),
        ...(payload.nextScheduledDate && { nextScheduledDate: new Date(payload.nextScheduledDate) }),
        ...(payload.lastScheduledDate && { lastScheduledDate: new Date(payload.lastScheduledDate) }),
        ...(payload.description !== undefined && { description: payload.description }),
      },
      include: {
        machine: { select: { id: true, name: true, type: true } },
        assignedEngineer: { select: { id: true, fullName: true, username: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update maintenance schedule error:", error);
    return { status: 500, message: "Failed to update maintenance schedule" };
  }
};

export const deleteMaintenanceSchedule = async (id: number): Promise<ServiceResult<unknown>> => {
  try {
    const schedule = await prisma.maintenanceSchedule.findUnique({ where: { id }, select: { id: true } });
    if (!schedule) return { status: 404, message: "Maintenance schedule not found" };
    await prisma.maintenanceSchedule.delete({ where: { id } });
    return { status: 200, data: { message: "Deleted successfully" } };
  } catch (error) {
    console.error("Delete maintenance schedule error:", error);
    return { status: 500, message: "Failed to delete maintenance schedule" };
  }
};
