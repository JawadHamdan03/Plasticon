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

export const createReceivable = async (
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { customerId, amount, dueDate, status, notes } = payload;

    if (!customerId || !amount || amount <= 0 || !dueDate) {
      return { status: 400, message: "Missing required fields" };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return { status: 404, message: "Customer not found" };
    }

    const receivable = await prisma.customerReceivable.create({
      data: {
        customerId,
        amount,
        dueDate: new Date(dueDate),
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
    const receivable = await prisma.customerReceivable.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!receivable) {
      return { status: 404, message: "Receivable not found" };
    }

    const updated = await prisma.customerReceivable.update({
      where: { id },
      data: {
        ...(payload.amount !== undefined && { amount: payload.amount }),
        ...(payload.dueDate && { dueDate: new Date(payload.dueDate) }),
        ...(payload.status && { status: payload.status }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
      },
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
