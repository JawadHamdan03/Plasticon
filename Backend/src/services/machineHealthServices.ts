import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllMachineHealthRecords = async (): Promise<ServiceResult<unknown>> => {
  try {
    const records = await prisma.machineHealthRecord.findMany({
      include: {
        machine: {  select: { id: true, name: true, type: true } },
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { recordedAt: "desc" },
    });
    return { status: 200, data: records };
  } catch (error) {
    console.error("Get all machine health records error:", error);
    return { status: 500, message: "Failed to fetch machine health records" };
  }
};

export const getMachineHealthHistory = async (
  machineId: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!machine) {
      return { status: 404, message: "Machine not found" };
    }

    const records = await prisma.machineHealthRecord.findMany({
      where: { machineId },
      include: {
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { recordedAt: "desc" },
    });

    return { status: 200, data: records };
  } catch (error) {
    console.error("Get machine health history error:", error);
    return { status: 500, message: "Failed to fetch machine health history" };
  }
};

export const createMachineHealthRecord = async (
  recordedById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { machineId, operationalStatus, downtimePercentage, maintenanceHours, efficiencyRating, notes } = payload;

    if (!machineId || !operationalStatus || typeof downtimePercentage !== "number" || !maintenanceHours) {
      return { status: 400, message: "Missing required fields" };
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!machine) {
      return { status: 404, message: "Machine not found" };
    }

    const record = await prisma.machineHealthRecord.create({
      data: {
        machineId,
        recordedById,
        operationalStatus,
        downtimePercentage: Math.min(100, Math.max(0, downtimePercentage)),
        maintenanceHours,
        efficiencyRating: Math.min(100, Math.max(0, efficiencyRating || 0)),
        notes: notes || null,
      },
      include: {
        machine: { select: { id: true, name: true, type: true } },
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: record };
  } catch (error) {
    console.error("Create machine health record error:", error);
    return { status: 500, message: "Failed to create machine health record" };
  }
};
