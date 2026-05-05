import { prisma } from "../config/lib/prisma";
import {
  MachineStatus,
  type MachineStatus as MachineStatusType,
} from "../config/generated/prisma/enums";

type ServiceResult<T> = { status: number; message?: string; data?: T };

export const getAllMachines = async (): Promise<
  ServiceResult<
    Array<{
      id: number;
      name: string;
      type: string;
      status: string;
      createdAt: string;
    }>
  >
> => {
  try {
    const machines = await prisma.machine.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      status: 200,
      data: machines.map((machine) => ({
        id: machine.id,
        name: machine.name,
        type: machine.type,
        status: machine.status,
        createdAt: machine.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch machines:", error);
    return {
      status: 500,
      message: "Failed to fetch machines",
    };
  }
};

export const createMachine = async (
  name: string,
  type: string,
): Promise<ServiceResult<{ id: number; name: string }>> => {
  try {
    const machine = await prisma.machine.create({
      data: {
        name,
        type,
        status: MachineStatus.OPERATIONAL,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      status: 201,
      data: machine,
    };
  } catch (error) {
    console.error("Failed to create machine:", error);
    return {
      status: 500,
      message: "Failed to create machine",
    };
  }
};

export const updateMachine = async (
  id: number,
  payload: {
    name?: string;
    type?: string;
    status?: string;
  },
): Promise<
  ServiceResult<{ id: number; name: string; type: string; status: string }>
> => {
  try {
    const data: {
      name?: string;
      type?: string;
      status?: MachineStatusType;
    } = {};

    if (payload.name) {
      data.name = payload.name;
    }

    if (payload.type) {
      data.type = payload.type;
    }

    if (payload.status) {
      const validStatuses: MachineStatusType[] = [
        MachineStatus.OPERATIONAL,
        MachineStatus.UNDER_MAINTENANCE,
        MachineStatus.BROKEN,
        MachineStatus.OFFLINE,
        MachineStatus.DECOMMISSIONED,
      ];

      if (!validStatuses.includes(payload.status as MachineStatusType)) {
        return {
          status: 400,
          message: "Invalid machine status",
        };
      }

      data.status = payload.status as MachineStatusType;
    }

    const machine = await prisma.machine.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      },
    });

    return {
      status: 200,
      data: machine,
    };
  } catch (error) {
    console.error("Failed to update machine:", error);
    return {
      status: 500,
      message: "Failed to update machine",
    };
  }
};

export const updateMachineStatus = async (
  id: number,
  status: string,
): Promise<ServiceResult<{ id: number; name: string; status: string }>> => {
  try {
    const validStatuses: MachineStatusType[] = [
      MachineStatus.OPERATIONAL,
      MachineStatus.UNDER_MAINTENANCE,
      MachineStatus.BROKEN,
      MachineStatus.OFFLINE,
      MachineStatus.DECOMMISSIONED,
    ];
    if (!validStatuses.includes(status as MachineStatusType)) {
      return {
        status: 400,
        message: "Invalid machine status",
      };
    }

    const machine = await prisma.machine.update({
      where: { id },
      data: { status: status as MachineStatusType },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return {
      status: 200,
      data: machine,
    };
  } catch (error) {
    console.error("Failed to update machine status:", error);
    return {
      status: 500,
      message: "Failed to update machine status",
    };
  }
};

export const deleteMachine = async (
  id: number,
): Promise<ServiceResult<null>> => {
  try {
    await prisma.machine.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      status: 200,
      data: null,
    };
  } catch (error) {
    console.error("Failed to delete machine:", error);
    return {
      status: 500,
      message: "Failed to delete machine",
    };
  }
};
