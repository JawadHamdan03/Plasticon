import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getAllBudgets = async (): Promise<ServiceResult<unknown>> => {
  try {
    const budgets = await prisma.budgetPlan.findMany({
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { month: "desc" },
    });
    return { status: 200, data: budgets };
  } catch (error) {
    console.error("Get all budgets error:", error);
    return { status: 500, message: "Failed to fetch budgets" };
  }
};

export const createBudget = async (
  createdById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const { month, category, allocated, spent } = payload;

    if (!month || !category || allocated === undefined || allocated <= 0) {
      return { status: 400, message: "Missing required fields" };
    }

    const budget = await prisma.budgetPlan.create({
      data: {
        month,
        category,
        allocated,
        spent: spent || 0,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 201, data: budget };
  } catch (error) {
    console.error("Create budget error:", error);
    return { status: 500, message: "Failed to create budget" };
  }
};

export const updateBudget = async (
  id: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    const budget = await prisma.budgetPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!budget) {
      return { status: 404, message: "Budget not found" };
    }

    const updated = await prisma.budgetPlan.update({
      where: { id },
      data: {
        ...(payload.allocated !== undefined && { allocated: payload.allocated }),
        ...(payload.spent !== undefined && { spent: payload.spent }),
        ...(payload.category && { category: payload.category }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update budget error:", error);
    return { status: 500, message: "Failed to update budget" };
  }
};

export const deleteBudget = async (
  id: number,
): Promise<ServiceResult<unknown>> => {
  try {
    const budget = await prisma.budgetPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!budget) {
      return { status: 404, message: "Budget not found" };
    }

    await prisma.budgetPlan.delete({ where: { id } });
    return { status: 200, message: "Budget deleted successfully" };
  } catch (error) {
    console.error("Delete budget error:", error);
    return { status: 500, message: "Failed to delete budget" };
  }
};
