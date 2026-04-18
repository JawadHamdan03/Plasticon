import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getFinancialDashboard = async (): Promise<ServiceResult<unknown>> => {
  try {
    // Get totals from invoices and expenses
    const invoices = await prisma.invoice.findMany({
      select: { totalAmount: true, paymentStatus: true },
    });

    const expenses = await prisma.expense.findMany({
      select: { amount: true, paymentStatus: true },
    });

    const allRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidRevenue = invoices
      .filter((inv) => inv.paymentStatus === "PAID")
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const allExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const approvedExpenses = expenses
      .filter((exp) => exp.paymentStatus === "APPROVED")
      .reduce((sum, exp) => sum + exp.amount, 0);

    const profit = paidRevenue - approvedExpenses;
    const profitMargin = paidRevenue > 0 ? (profit / paidRevenue) * 100 : 0;

    // Get cash balance (simplified - invoices paid minus expenses paid)
    const cashBalance = paidRevenue - (expenses
      .filter((exp) => exp.paymentStatus === "PAID")
      .reduce((sum, exp) => sum + exp.amount, 0));

    const settings = await prisma.financialSetting.findFirst();

    return {
      status: 200,
      data: {
        revenue: parseFloat(allRevenue.toFixed(2)),
        paidRevenue: parseFloat(paidRevenue.toFixed(2)),
        expenses: parseFloat(allExpenses.toFixed(2)),
        approvedExpenses: parseFloat(approvedExpenses.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        cashBalance: parseFloat(cashBalance.toFixed(2)),
        targets: {
          revenueTarget: settings?.revenueTarget || 0,
          expenseLimit: settings?.expenseLimit || 0,
          profitMarginTarget: settings?.profitMarginTarget || 0,
        },
      },
    };
  } catch (error) {
    console.error("Get financial dashboard error:", error);
    return { status: 500, message: "Failed to fetch financial dashboard" };
  }
};

export const getFinancialSettings = async (): Promise<ServiceResult<unknown>> => {
  try {
    const settings = await prisma.financialSetting.findFirst({
      include: {
        updatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!settings) {
      // Create default settings if not exist
      const created = await prisma.financialSetting.create({
        data: {
          revenueTarget: 0,
          expenseLimit: 0,
          profitMarginTarget: 0,
        },
        include: {
          updatedBy: { select: { id: true, fullName: true, username: true } },
        },
      });
      return { status: 200, data: created };
    }

    return { status: 200, data: settings };
  } catch (error) {
    console.error("Get financial settings error:", error);
    return { status: 500, message: "Failed to fetch financial settings" };
  }
};

export const updateFinancialSettings = async (
  updatedById: number,
  payload: any,
): Promise<ServiceResult<unknown>> => {
  try {
    let settings = await prisma.financialSetting.findFirst();

    if (!settings) {
      settings = await prisma.financialSetting.create({
        data: { revenueTarget: 0, expenseLimit: 0, profitMarginTarget: 0 },
      });
    }

    const updated = await prisma.financialSetting.update({
      where: { id: settings.id },
      data: {
        ...(payload.revenueTarget !== undefined && { revenueTarget: payload.revenueTarget }),
        ...(payload.expenseLimit !== undefined && { expenseLimit: payload.expenseLimit }),
        ...(payload.profitMarginTarget !== undefined && { profitMarginTarget: payload.profitMarginTarget }),
        updatedById,
      },
      include: {
        updatedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    return { status: 200, data: updated };
  } catch (error) {
    console.error("Update financial settings error:", error);
    return { status: 500, message: "Failed to update financial settings" };
  }
};
