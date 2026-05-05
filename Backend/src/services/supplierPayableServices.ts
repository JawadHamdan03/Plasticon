import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllPayables = async (): Promise<ServiceResult<unknown>> => {
  try {
    const payables = await prisma.supplierPayable.findMany({
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    return { status: 200, data: payables };
  } catch (error) {
    console.error("Get all payables error:", error);
    return { status: 500, message: "Failed to fetch payables" };
  }
};

export const createPayable = async (
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { supplierId, amount, dueDate, paymentStatus, notes } = payload;

    if (!supplierId || !amount || amount <= 0 || !dueDate) {
      return { status: 400, message: "Missing required fields" };
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });

    if (!supplier) {
      return { status: 404, message: "Supplier not found" };
    }

    const payable = await prisma.supplierPayable.create({
      data: {
        supplierId,
        amount,
        dueDate: new Date(dueDate),
        paymentStatus: paymentStatus || "PENDING",
        notes: notes || null,
      },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return { status: 201, data: payable };
  } catch (error) {
    console.error("Create payable error:", error);
    return { status: 500, message: "Failed to create payable" };
  }
};

export const updatePayable = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const payable = await prisma.supplierPayable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!payable) {
      return { status: 404, message: "Payable not found" };
    }

    const updated = await prisma.supplierPayable.update({
      where: { id },
      data: {
        ...(payload.amount !== undefined && { amount: payload.amount }),
        ...(payload.dueDate && { dueDate: new Date(payload.dueDate) }),
        ...(payload.paymentStatus && { paymentStatus: payload.paymentStatus }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
      },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update payable error:", error);
    return { status: 500, message: "Failed to update payable" };
  }
};

export const deletePayable = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const payable = await prisma.supplierPayable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!payable) {
      return { status: 404, message: "Payable not found" };
    }

    await prisma.supplierPayable.delete({ where: { id } });
    return { status: 200, message: "Payable deleted successfully" };
  } catch (error) {
    console.error("Delete payable error:", error);
    return { status: 500, message: "Failed to delete payable" };
  }
};
