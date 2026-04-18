import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllExpenses = async (): Promise<ServiceResult<unknown>> => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        submittedBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
    return { status: 200, data: expenses };
  } catch (error) {
    console.error("Get all expenses error:", error);
    return { status: 500, message: "Failed to fetch expenses" };
  }
};

export const createExpense = async (
  submittedById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { category, amount, description, notes } = payload;

    if (!category || !amount || amount <= 0) {
      return { status: 400, message: "Missing required fields" };
    }

    const expense = await prisma.expense.create({
      data: {
        submittedById,
        category,
        amount,
        description: description || notes || null,
        paymentStatus: "PENDING",
      },
      include: {
        submittedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: expense };
  } catch (error) {
    console.error("Create expense error:", error);
    return { status: 500, message: "Failed to create expense" };
  }
};

export const deleteExpense = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!expense) {
      return { status: 404, message: "Expense not found" };
    }

    await prisma.expense.delete({ where: { id } });
    return { status: 200, message: "Expense deleted successfully" };
  } catch (error) {
    console.error("Delete expense error:", error);
    return { status: 500, message: "Failed to delete expense" };
  }
};

export const approveExpense = async (
  id: number,
  approvedById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!expense) {
      return { status: 404, message: "Expense not found" };
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        approvedById,
        approvedAt: new Date(),
        paymentStatus: payload.paymentStatus || "APPROVED",
      },
      include: {
        submittedBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Approve expense error:", error);
    return { status: 500, message: "Failed to approve expense" };
  }
};
