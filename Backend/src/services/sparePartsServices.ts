import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllSpareParts = async (): Promise<ServiceResult<unknown>> => {
  try {
    const parts = await prisma.sparePart.findMany({
      include: {
        machine: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { status: 200, data: parts };
  } catch (error) {
    console.error("Get all spare parts error:", error);
    return { status: 500, message: "Failed to fetch spare parts" };
  }
};

export const createSparePart = async (payload: any): Promise<ServiceResult<unknown>> => {
  try {
    const { machineId, name, quantity, minQuantity, unitPrice, supplier, notes } = payload;

    if (!machineId || !name || !quantity || minQuantity === undefined || !unitPrice) {
      return { status: 400, message: "Missing required fields" };
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: { id: true },
    });

    if (!machine) {
      return { status: 404, message: "Machine not found" };
    }

    const part = await prisma.sparePart.create({
      data: {
        machineId,
        name,
        quantity: Math.max(0, quantity),
        minQuantity: Math.max(0, minQuantity),
        unitPrice,
        supplier: supplier || null,
        notes: notes || null,
      },
      include: {
        machine: { select: { id: true, name: true, type: true } },
      },
    });

    return { status: 201, data: part };
  } catch (error) {
    console.error("Create spare part error:", error);
    return { status: 500, message: "Failed to create spare part" };
  }
};

export const updateSparePartQuantity = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const part = await prisma.sparePart.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!part) {
      return { status: 404, message: "Spare part not found" };
    }

    const updated = await prisma.sparePart.update({
      where: { id },
      data: {
        ...(payload.quantity !== undefined && { quantity: Math.max(0, payload.quantity) }),
        ...(payload.minQuantity !== undefined && { minQuantity: Math.max(0, payload.minQuantity) }),
        ...(payload.unitPrice !== undefined && { unitPrice: payload.unitPrice }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
        ...(payload.lastRestockedDate && { lastRestockedDate: new Date(payload.lastRestockedDate) }),
      },
      include: {
        machine: { select: { id: true, name: true, type: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update spare part error:", error);
    return { status: 500, message: "Failed to update spare part" };
  }
};

export const deleteSparePart = async (id: number): Promise<ServiceResult<unknown>> => {
  try {
    const part = await prisma.sparePart.findUnique({ where: { id }, select: { id: true } });
    if (!part) return { status: 404, message: "Spare part not found" };
    await prisma.sparePart.delete({ where: { id } });
    return { status: 200, data: { message: "Deleted successfully" } };
  } catch (error) {
    console.error("Delete spare part error:", error);
    return { status: 500, message: "Failed to delete spare part" };
  }
};
