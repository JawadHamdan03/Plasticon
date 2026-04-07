import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = { status: number; message?: string; data?: T };

export const getAllShifts = async (): Promise<
  ServiceResult<
    Array<{
      id: number;
      name: string;
      startTime: string;
      endTime: string;
    }>
  >
> => {
  try {
    const shifts = await prisma.shift.findMany({
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: "asc" },
    });

    return {
      status: 200,
      data: shifts.map((shift) => ({
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Failed to fetch shifts:", error);
    return {
      status: 500,
      message: "Failed to fetch shifts",
    };
  }
};

export const createShift = async (
  name: string,
  startTime: string,
  endTime: string,
): Promise<ServiceResult<{ id: number; name: string }>> => {
  try {
    const shift = await prisma.shift.create({
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      status: 201,
      data: shift,
    };
  } catch (error) {
    console.error("Failed to create shift:", error);
    return {
      status: 500,
      message: "Failed to create shift",
    };
  }
};

export const updateShift = async (
  id: number,
  name?: string,
  startTime?: string,
  endTime?: string,
): Promise<ServiceResult<{ id: number; name: string }>> => {
  try {
    const shift = await prisma.shift.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      status: 200,
      data: shift,
    };
  } catch (error) {
    console.error("Failed to update shift:", error);
    return {
      status: 500,
      message: "Failed to update shift",
    };
  }
};

export const deleteShift = async (id: number): Promise<ServiceResult<null>> => {
  try {
    await prisma.shift.delete({
      where: { id },
    });

    return {
      status: 200,
      data: null,
    };
  } catch (error) {
    console.error("Failed to delete shift:", error);
    return {
      status: 500,
      message: "Failed to delete shift",
    };
  }
};
