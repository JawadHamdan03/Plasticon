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

async function resolveSupplierId(
  supplierId?: number,
  supplierName?: string,
): Promise<number | null> {
  if (supplierId) return supplierId;
  if (!supplierName?.trim()) return null;

  const name = supplierName.trim();
  let supplier = await prisma.supplier.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name },
      select: { id: true },
    });
  }

  return supplier.id;
}

export const createPayable = async (
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { supplierId, supplierName, amount, dueDate, paymentStatus, status, notes } = payload;

    if (!amount || amount <= 0) {
      return { status: 400, message: "Amount must be a positive number" };
    }

    const resolvedId = await resolveSupplierId(supplierId, supplierName);
    if (!resolvedId) {
      return { status: 400, message: "Supplier name or ID is required" };
    }

    const payable = await prisma.supplierPayable.create({
      data: {
        supplierId: resolvedId,
        amount,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentStatus: paymentStatus || status || "PENDING",
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
    const existing = await prisma.supplierPayable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { status: 404, message: "Payable not found" };
    }

    const updateData: any = {};

    if (payload.amount !== undefined) updateData.amount = payload.amount;
    if (payload.dueDate) updateData.dueDate = new Date(payload.dueDate);
    if (payload.paymentStatus || payload.status) {
      updateData.paymentStatus = payload.paymentStatus || payload.status;
    }
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    if (payload.supplierId || payload.supplierName) {
      const resolvedId = await resolveSupplierId(payload.supplierId, payload.supplierName);
      if (resolvedId) updateData.supplierId = resolvedId;
    }

    const updated = await prisma.supplierPayable.update({
      where: { id },
      data: updateData,
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
