import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

export const getFinancialDashboard = async (): Promise<ServiceResult<unknown>> => {
  try {
    // Use allSettled so a missing/empty table doesn't abort the whole dashboard
    const [invRes, expRes, elRes, payRes, saleRes, purchRes] = await Promise.allSettled([
      prisma.invoice.findMany({ select: { totalAmount: true, paymentStatus: true } }),
      prisma.expense.findMany({ select: { amount: true, paymentStatus: true } }),
      prisma.electricityReading.findMany({ select: { shiftCost: true } }),
      prisma.payroll.findMany({ select: { totalSalary: true } }),
      prisma.sale.findMany({ select: { totalAmount: true } }),
      prisma.purchase.findMany({ select: { totalAmount: true } }),
    ]);
    const invoices           = invRes.status   === "fulfilled" ? invRes.value   : [];
    const expenses           = expRes.status   === "fulfilled" ? expRes.value   : [];
    const electricityReadings = elRes.status   === "fulfilled" ? elRes.value    : [];
    const payrolls           = payRes.status   === "fulfilled" ? payRes.value   : [];
    const sales              = saleRes.status  === "fulfilled" ? saleRes.value  : [];
    const purchases          = purchRes.status === "fulfilled" ? purchRes.value : [];

    const allRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidRevenue = invoices
      .filter((inv) => inv.paymentStatus === "PAID")
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    const allExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const approvedExpenses = expenses
      .filter((exp) => exp.paymentStatus === "APPROVED")
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Electricity: total cost of all recorded readings
    const electricityCost = parseFloat(
      electricityReadings.reduce((sum, r) => sum + (r.shiftCost ?? 0), 0).toFixed(2),
    );

    // Salaries: total of all payroll records (Payroll has no payment status)
    const salaryCost = parseFloat(
      payrolls.reduce((sum, p) => sum + p.totalSalary, 0).toFixed(2),
    );

    // Actual sales revenue (from Sales module, not invoices)
    const salesRevenue = parseFloat(
      sales.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2),
    );

    // Total raw material cost (from purchases)
    const rawMaterialCost = parseFloat(
      purchases.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(2),
    );

    // Net profit using real factory formula:
    // Net Profit = Sales - (Raw Materials + Electricity + Salaries + Other Expenses)
    const netProfit = parseFloat(
      (salesRevenue - rawMaterialCost - electricityCost - salaryCost - approvedExpenses).toFixed(2),
    );
    const profitMargin = salesRevenue > 0 ? parseFloat(((netProfit / salesRevenue) * 100).toFixed(2)) : 0;

    // Legacy fields kept for backward compat
    const profit = paidRevenue - approvedExpenses;
    const cashBalance = paidRevenue - expenses
      .filter((exp) => exp.paymentStatus === "PAID")
      .reduce((sum, exp) => sum + exp.amount, 0);

    const settings = await prisma.financialSetting.findFirst();

    return {
      status: 200,
      data: {
        // Core financials
        revenue: parseFloat(allRevenue.toFixed(2)),
        paidRevenue: parseFloat(paidRevenue.toFixed(2)),
        expenses: parseFloat(allExpenses.toFixed(2)),
        approvedExpenses: parseFloat(approvedExpenses.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        profitMargin: parseFloat(((paidRevenue > 0 ? (profit / paidRevenue) : 0) * 100).toFixed(2)),
        cashBalance: parseFloat(cashBalance.toFixed(2)),
        // Factory-specific KPIs
        salesRevenue,
        rawMaterialCost,
        electricityCost,
        salaryCost,
        netProfit,
        netProfitMargin: profitMargin,
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
