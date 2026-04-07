import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = { status: number; message?: string; data?: T };

export const getDashboardAnalytics = async (): Promise<
  ServiceResult<{
    totalUsers: number;
    activeUsers: number;
    totalMachines: number;
    operationalMachines: number;
    totalShifts: number;
    todayTotalHours: number;
    thisMonthPayroll: number;
    productionToday: number;
    inventoryItems: number;
    lowStockItems: number;
  }>
> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalMachines,
      operationalMachines,
      totalShifts,
      attendanceToday,
      payrollThisMonth,
      productionToday,
      inventoryItems,
      lowStockItems,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.machine.count({ where: { deletedAt: null } }),
      prisma.machine.count({
        where: { deletedAt: null, status: "OPERATIONAL" },
      }),
      prisma.shift.count(),
      prisma.attendance.count({
        where: {
          checkIn: { gte: today, lt: tomorrow },
        },
      }),
      prisma.payroll.aggregate({
        where: {
          month: { gte: monthStart.toISOString().slice(0, 7) },
        },
        _sum: {
          totalSalary: true,
        },
      }),
      prisma.productionRecord.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.rawMaterial.count(),
      prisma.rawMaterial.count({
        where: {
          currentQuantity: {
            lte: 0,
          },
        },
      }),
    ]);

    return {
      status: 200,
      data: {
        totalUsers,
        activeUsers,
        totalMachines,
        operationalMachines,
        totalShifts,
        todayTotalHours: attendanceToday,
        thisMonthPayroll: payrollThisMonth._sum.totalSalary ?? 0,
        productionToday,
        inventoryItems,
        lowStockItems,
      },
    };
  } catch (error) {
    console.error("Failed to get dashboard analytics:", error);
    return {
      status: 500,
      message: "Failed to get dashboard analytics",
    };
  }
};

export const getQuickStats = async (): Promise<
  ServiceResult<{
    machineStatusBreakdown: Array<{
      status: string;
      count: number;
    }>;
    userRoleBreakdown: Array<{
      role: string;
      count: number;
    }>;
  }>
> => {
  try {
    const machineStatuses = await prisma.machine.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
      where: { deletedAt: null },
    });

    const userRoles = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        _all: true,
      },
      where: { deletedAt: null },
    });

    return {
      status: 200,
      data: {
        machineStatusBreakdown: machineStatuses.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        userRoleBreakdown: userRoles.map((item) => ({
          role: item.role,
          count: item._count._all,
        })),
      },
    };
  } catch (error) {
    console.error("Failed to get quick stats:", error);
    return {
      status: 500,
      message: "Failed to get quick stats",
    };
  }
};
