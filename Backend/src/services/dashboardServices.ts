import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = { status: number; message?: string; data?: T };

type LowStockRow = {
  id: bigint;
  name: string;
  currentQuantity: number;
  unit: string;
  minQuantity: number;
};

export const getDashboardOverview = async (): Promise<ServiceResult<unknown>> => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Week start = Monday
    const weekStart = new Date(today);
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const [
      usersByRoleRaw,
      totalUsers,
      activeUsers,
      attendanceToday,
      lateToday,
      productionToday,
      productionWeek,
      productionMonth,
      machinesByStatusRaw,
      totalRawMaterials,
      outOfStockCount,
      maintenanceThisMonth,
      overdueSchedules,
      pendingSchedules,
      qualityThisWeek,
      openQualityIssues,
      qualityBySeverityRaw,
      salesThisMonth,
      purchasesThisMonth,
      expensesPending,
      expensesThisMonth,
      invoicesPending,
      invoicesOverdue,
      payrollThisMonth,
      pendingRegistrations,
      totalShifts,
      lowStockRaw,
      recentProductionRaw,
      recentMaintenanceRaw,
    ] = await Promise.all([
      // Users
      prisma.user.groupBy({ by: ["role"], _count: { _all: true }, where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),

      // Attendance
      prisma.attendance.count({ where: { checkIn: { gte: today, lt: tomorrow } } }),
      prisma.attendance.count({ where: { checkIn: { gte: today, lt: tomorrow }, lateMinutes: { gt: 0 } } }),

      // Production
      prisma.productionRecord.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { cartonsCount: true, totalPieces: true },
        _count: { _all: true },
      }),
      prisma.productionRecord.aggregate({
        where: { createdAt: { gte: weekStart, lt: tomorrow } },
        _sum: { totalPieces: true, cartonsCount: true },
      }),
      prisma.productionRecord.aggregate({
        where: { createdAt: { gte: monthStart, lt: tomorrow } },
        _sum: { totalPieces: true, cartonsCount: true },
      }),

      // Machines
      prisma.machine.groupBy({ by: ["status"], _count: { _all: true }, where: { deletedAt: null } }),

      // Inventory
      prisma.rawMaterial.count(),
      prisma.rawMaterial.count({ where: { currentQuantity: { lte: 0 } } }),

      // Maintenance
      prisma.maintenance.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.maintenanceSchedule.count({ where: { status: "OVERDUE" } }),
      prisma.maintenanceSchedule.count({ where: { status: "PENDING", nextScheduledDate: { lte: tomorrow } } }),

      // Quality
      prisma.qualityCheck.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.qualityCheck.count({ where: { resolvedAt: null } }),
      prisma.qualityCheck.groupBy({ by: ["severity"], _count: { _all: true } }),

      // Finance
      prisma.sale.aggregate({
        where: { date: { gte: monthStart, lt: tomorrow } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.purchase.aggregate({
        where: { date: { gte: monthStart, lt: tomorrow } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.expense.count({ where: { paymentStatus: "PENDING" } }),
      prisma.expense.aggregate({
        where: { submittedAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.invoice.count({ where: { paymentStatus: "PENDING" } }),
      prisma.invoice.count({ where: { paymentStatus: "OVERDUE" } }),

      // Payroll
      prisma.payroll.aggregate({
        where: { month: { startsWith: monthStr } },
        _sum: { totalSalary: true },
      }),

      // Registrations
      prisma.registrationRequest.count({ where: { status: "PENDING" } }),

      // Shifts
      prisma.shift.count(),

      // Low stock (currentQuantity <= minQuantity but > 0)
      prisma.$queryRaw<LowStockRow[]>`
        SELECT id, name, "currentQuantity", unit, "minQuantity"
        FROM "RawMaterial"
        WHERE "currentQuantity" <= "minQuantity" AND "currentQuantity" > 0
        ORDER BY ("currentQuantity" / GREATEST("minQuantity",1)) ASC
        LIMIT 8
      `,

      // Recent production today
      prisma.productionRecord.findMany({
        where: { createdAt: { gte: today, lt: tomorrow } },
        select: {
          id: true,
          totalPieces: true,
          cartonsCount: true,
          createdAt: true,
          user: { select: { fullName: true } },
          machine: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),

      // Recent maintenance this month
      prisma.maintenance.findMany({
        where: { createdAt: { gte: monthStart } },
        select: {
          id: true,
          downtimeReason: true,
          downtimeMinutes: true,
          createdAt: true,
          engineer: { select: { fullName: true } },
          machine: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const totalMachines = machinesByStatusRaw.reduce((s, r) => s + r._count._all, 0);
    const operationalMachines = machinesByStatusRaw.find((r) => r.status === "OPERATIONAL")?._count._all ?? 0;

    return {
      status: 200,
      data: {
        // People
        totalUsers,
        activeUsers,
        usersByRole: usersByRoleRaw.map((r) => ({ role: r.role, count: r._count._all })),
        attendanceToday,
        lateToday,
        pendingRegistrations,

        // Production
        production: {
          todayRecords: productionToday._count._all,
          todayCartons: productionToday._sum.cartonsCount ?? 0,
          todayPieces: productionToday._sum.totalPieces ?? 0,
          weekPieces: productionWeek._sum.totalPieces ?? 0,
          weekCartons: productionWeek._sum.cartonsCount ?? 0,
          monthPieces: productionMonth._sum.totalPieces ?? 0,
          monthCartons: productionMonth._sum.cartonsCount ?? 0,
        },

        // Machines
        totalMachines,
        operationalMachines,
        machinesByStatus: machinesByStatusRaw.map((r) => ({ status: r.status, count: r._count._all })),

        // Inventory
        totalRawMaterials,
        outOfStockCount,
        lowStockMaterials: (lowStockRaw as LowStockRow[]).map((r) => ({
          id: Number(r.id),
          name: r.name,
          currentQuantity: Number(r.currentQuantity),
          unit: r.unit,
          minQuantity: Number(r.minQuantity),
        })),

        // Maintenance
        maintenanceThisMonth,
        overdueSchedules,
        pendingSchedules,

        // Quality
        qualityThisWeek,
        openQualityIssues,
        qualityBySeverity: qualityBySeverityRaw.map((r) => ({ severity: r.severity, count: r._count._all })),

        // Finance
        salesThisMonth: salesThisMonth._sum.totalAmount ?? 0,
        salesCountThisMonth: salesThisMonth._count._all,
        purchasesThisMonth: purchasesThisMonth._sum.totalAmount ?? 0,
        purchasesCountThisMonth: purchasesThisMonth._count._all,
        expensesPending,
        expensesThisMonth: expensesThisMonth._sum.amount ?? 0,
        invoicesPending,
        invoicesOverdue,
        payrollThisMonth: payrollThisMonth._sum.totalSalary ?? 0,

        // Other
        totalShifts,

        // Recent activity
        recentProduction: recentProductionRaw.map((r) => ({
          id: r.id,
          workerName: r.user.fullName,
          machineName: r.machine?.name ?? "—",
          totalPieces: r.totalPieces,
          cartonsCount: r.cartonsCount,
          createdAt: r.createdAt.toISOString(),
        })),
        recentMaintenance: recentMaintenanceRaw.map((r) => ({
          id: r.id,
          engineerName: r.engineer.fullName,
          machineName: r.machine.name,
          downtimeReason: r.downtimeReason,
          downtimeMinutes: r.downtimeMinutes,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("getDashboardOverview error:", error);
    return { status: 500, message: "Failed to load dashboard overview" };
  }
};

// Keep old endpoints for backward compatibility
export const getDashboardAnalytics = async (): Promise<ServiceResult<unknown>> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalUsers, activeUsers, totalMachines, operationalMachines, totalShifts, attendanceToday, payrollThisMonth, productionToday, inventoryItems, lowStockItems] =
      await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { deletedAt: null, isActive: true } }),
        prisma.machine.count({ where: { deletedAt: null } }),
        prisma.machine.count({ where: { deletedAt: null, status: "OPERATIONAL" } }),
        prisma.shift.count(),
        prisma.attendance.count({ where: { checkIn: { gte: today, lt: tomorrow } } }),
        prisma.payroll.aggregate({ where: { month: { gte: monthStart.toISOString().slice(0, 7) } }, _sum: { totalSalary: true } }),
        prisma.productionRecord.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        prisma.rawMaterial.count(),
        prisma.rawMaterial.count({ where: { currentQuantity: { lte: 0 } } }),
      ]);
    return {
      status: 200,
      data: { totalUsers, activeUsers, totalMachines, operationalMachines, totalShifts, todayTotalHours: attendanceToday, thisMonthPayroll: payrollThisMonth._sum.totalSalary ?? 0, productionToday, inventoryItems, lowStockItems },
    };
  } catch (e) {
    return { status: 500, message: "Failed to get dashboard analytics" };
  }
};

export const getDashboardCharts = async (days = 7): Promise<ServiceResult<unknown>> => {
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 7)));
  try {
    const [
      productionByDay,
      electricityByDay,
      salesByMonth,
      expensesByMonth,
      attendanceByDay,
      maintenanceByMonth,
      quotationsByStatus,
      qualityBySeverity,
      machinesByStatus,
      usersByRole,
    ] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT DATE("createdAt") as date,
               COALESCE(SUM("totalPieces"),0)::int as pieces,
               COALESCE(SUM("cartonsCount"),0)::int as cartons
        FROM "ProductionRecord"
        WHERE "createdAt" >= NOW() - (${safeDays} * INTERVAL '1 day')
        GROUP BY DATE("createdAt") ORDER BY date`,

      prisma.$queryRaw<any[]>`
        SELECT DATE(date) as date, COALESCE(SUM(consumption),0)::float as kwh
        FROM "ElectricityReading"
        WHERE date >= NOW() - (${safeDays} * INTERVAL '1 day')
        GROUP BY DATE(date) ORDER BY date`,

      prisma.$queryRaw<any[]>`
        SELECT TO_CHAR(date,'MM/YY') as month,
               DATE_TRUNC('month',date) as sort,
               COALESCE(SUM("totalAmount"),0)::float as amount
        FROM "Sale"
        WHERE date >= NOW() - (${safeDays} * INTERVAL '1 day')
        GROUP BY TO_CHAR(date,'MM/YY'), DATE_TRUNC('month',date)
        ORDER BY sort`,

      prisma.$queryRaw<any[]>`
        SELECT TO_CHAR("submittedAt",'MM/YY') as month,
               DATE_TRUNC('month',"submittedAt") as sort,
               COALESCE(SUM(amount),0)::float as amount
        FROM "Expense"
        WHERE "submittedAt" >= NOW() - (${safeDays} * INTERVAL '1 day')
        GROUP BY TO_CHAR("submittedAt",'MM/YY'), DATE_TRUNC('month',"submittedAt")
        ORDER BY sort`,

      prisma.$queryRaw<any[]>`
        SELECT DATE("checkIn") as date,
               COUNT(*)::int as present,
               SUM(CASE WHEN "lateMinutes">0 THEN 1 ELSE 0 END)::int as late
        FROM "Attendance"
        WHERE "checkIn" >= NOW() - (${safeDays} * INTERVAL '1 day')
        GROUP BY DATE("checkIn") ORDER BY date`,

      prisma.$queryRaw<any[]>`
        SELECT TO_CHAR("createdAt",'MM/YY') as month,
               DATE_TRUNC('month',"createdAt") as sort,
               COUNT(*)::int as count
        FROM "Maintenance"
        WHERE "createdAt" >= NOW() - (${safeDays} * INTERVAL '1 day')
        GROUP BY TO_CHAR("createdAt",'MM/YY'), DATE_TRUNC('month',"createdAt")
        ORDER BY sort`,

      prisma.quotation.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.qualityCheck.groupBy({ by: ["severity"], _count: { _all: true } }),
      prisma.machine.groupBy({ by: ["status"], _count: { _all: true }, where: { deletedAt: null } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true }, where: { deletedAt: null } }),
    ]);

    const fmtDate = (d: any) =>
      new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fmtWeekday = (d: any) =>
      new Date(d).toLocaleDateString("en-US", { weekday: "short" });

    return {
      status: 200,
      data: {
        productionByDay: productionByDay.map((r) => ({
          date: fmtDate(r.date),
          pieces: Number(r.pieces) || 0,
          cartons: Number(r.cartons) || 0,
        })),
        electricityByDay: electricityByDay.map((r) => ({
          date: fmtDate(r.date),
          kwh: Number(r.kwh) || 0,
        })),
        salesByMonth: salesByMonth.map((r) => ({
          month: r.month,
          amount: Number(r.amount) || 0,
        })),
        expensesByMonth: expensesByMonth.map((r) => ({
          month: r.month,
          amount: Number(r.amount) || 0,
        })),
        attendanceByDay: attendanceByDay.map((r) => ({
          date: fmtWeekday(r.date),
          present: Number(r.present) || 0,
          late: Number(r.late) || 0,
        })),
        maintenanceByMonth: maintenanceByMonth.map((r) => ({
          month: r.month,
          count: Number(r.count) || 0,
        })),
        quotationsByStatus: quotationsByStatus.map((r) => ({
          status: r.status,
          count: r._count._all,
        })),
        qualityBySeverity: qualityBySeverity.map((r) => ({
          severity: r.severity,
          count: r._count._all,
        })),
        machinesByStatus: machinesByStatus.map((r) => ({
          status: r.status,
          count: r._count._all,
        })),
        usersByRole: usersByRole.map((r) => ({
          role: r.role,
          count: r._count._all,
        })),
      },
    };
  } catch (error) {
    console.error("getDashboardCharts error:", error);
    return { status: 500, message: "Failed to load chart data" };
  }
};

export const getQuickStats = async (): Promise<ServiceResult<unknown>> => {
  try {
    const [machineStatuses, userRoles] = await Promise.all([
      prisma.machine.groupBy({ by: ["status"], _count: { _all: true }, where: { deletedAt: null } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true }, where: { deletedAt: null } }),
    ]);
    return {
      status: 200,
      data: {
        machineStatusBreakdown: machineStatuses.map((i) => ({ status: i.status, count: i._count._all })),
        userRoleBreakdown: userRoles.map((i) => ({ role: i.role, count: i._count._all })),
      },
    };
  } catch (e) {
    return { status: 500, message: "Failed to get quick stats" };
  }
};
