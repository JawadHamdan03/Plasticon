import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllReceivables = async (): Promise<ServiceResult<unknown>> => {
  try {
    const receivables = await prisma.customerReceivable.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    return { status: 200, data: receivables };
  } catch (error) {
    console.error("Get all receivables error:", error);
    return { status: 500, message: "Failed to fetch receivables" };
  }
};

async function resolveCustomerId(
  customerId?: number,
  customerName?: string,
): Promise<number | null> {
  if (customerId) return customerId;
  if (!customerName?.trim()) return null;

  const name = customerName.trim();
  let customer = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: { name },
      select: { id: true },
    });
  }

  return customer.id;
}

export const createReceivable = async (
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { customerId, customerName, amount, dueDate, status, notes } = payload;

    if (!amount || amount <= 0) {
      return { status: 400, message: "Amount must be a positive number" };
    }

    const resolvedId = await resolveCustomerId(customerId, customerName);
    if (!resolvedId) {
      return { status: 400, message: "Customer name or ID is required" };
    }

    const receivable = await prisma.customerReceivable.create({
      data: {
        customerId: resolvedId,
        amount,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: status || "PENDING",
        notes: notes || null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return { status: 201, data: receivable };
  } catch (error) {
    console.error("Create receivable error:", error);
    return { status: 500, message: "Failed to create receivable" };
  }
};

export const updateReceivable = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const existing = await prisma.customerReceivable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return { status: 404, message: "Receivable not found" };
    }

    const updateData: any = {};

    if (payload.amount !== undefined) updateData.amount = payload.amount;
    if (payload.dueDate) updateData.dueDate = new Date(payload.dueDate);
    if (payload.status) updateData.status = payload.status;
    if (payload.notes !== undefined) updateData.notes = payload.notes;

    if (payload.customerId || payload.customerName) {
      const resolvedId = await resolveCustomerId(payload.customerId, payload.customerName);
      if (resolvedId) updateData.customerId = resolvedId;
    }

    const updated = await prisma.customerReceivable.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update receivable error:", error);
    return { status: 500, message: "Failed to update receivable" };
  }
};

export const deleteReceivable = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const receivable = await prisma.customerReceivable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!receivable) {
      return { status: 404, message: "Receivable not found" };
    }

    await prisma.customerReceivable.delete({ where: { id } });
    return { status: 200, message: "Receivable deleted successfully" };
  } catch (error) {
    console.error("Delete receivable error:", error);
    return { status: 500, message: "Failed to delete receivable" };
  }
};
