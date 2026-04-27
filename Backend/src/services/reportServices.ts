import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type WeeklyProductionQuery = {
  date?: string;
};

type DailyProductionQuery = {
  date?: string;
};

type MonthlySalesQuery = {
  month?: string;
};

type YearlySalesQuery = {
  year?: string;
};

type InventorySnapshotQuery = {
  lowStockThreshold?: string;
};

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

type PeriodQuery = {
  period?: string;
  date?: string;
  month?: string;
  year?: string;
};

const startOfDay = (date: Date): Date => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date): Date => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const addDays = (date: Date, days: number): Date => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const parseDateInput = (input?: string): Date | null => {
  if (!input) {
    return new Date();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const parseMonthInput = (
  input?: string,
): { start: Date; end: Date; label: string } | null => {
  if (!input) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return {
      start,
      end,
      label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return {
    start,
    end,
    label: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
  };
};

const parseYearInput = (
  input?: string,
): { start: Date; end: Date; year: number } | null => {
  if (!input) {
    const now = new Date();
    const year = now.getFullYear();
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
      year,
    };
  }

  const trimmed = input.trim();
  if (!/^\d{4}$/.test(trimmed)) {
    return null;
  }

  const year = Number(trimmed);
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return null;
  }

  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
    year,
  };
};

const getWeekRange = (anchorDate: Date): { weekStart: Date; weekEnd: Date } => {
  const normalized = startOfDay(anchorDate);
  const day = normalized.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = addDays(normalized, diffToMonday);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  return { weekStart, weekEnd };
};

const resolvePeriodRange = (
  query: PeriodQuery = {},
): {
  period: ReportPeriod;
  start: Date;
  end: Date;
  label: string;
} | null => {
  const rawPeriod = query.period?.trim().toLowerCase();
  const period: ReportPeriod =
    rawPeriod === "daily" ||
    rawPeriod === "weekly" ||
    rawPeriod === "monthly" ||
    rawPeriod === "yearly"
      ? rawPeriod
      : "daily";

  if (period === "daily") {
    const anchorDate = parseDateInput(query.date);
    if (!anchorDate) {
      return null;
    }

    const start = startOfDay(anchorDate);
    const end = endOfDay(anchorDate);
    return {
      period,
      start,
      end,
      label: start.toISOString().slice(0, 10),
    };
  }

  if (period === "weekly") {
    const anchorDate = parseDateInput(query.date);
    if (!anchorDate) {
      return null;
    }

    const { weekStart, weekEnd } = getWeekRange(anchorDate);
    return {
      period,
      start: weekStart,
      end: weekEnd,
      label: `${weekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`,
    };
  }

  if (period === "monthly") {
    const range = parseMonthInput(query.month);
    if (!range) {
      return null;
    }

    return {
      period,
      start: range.start,
      end: range.end,
      label: range.label,
    };
  }

  const range = parseYearInput(query.year);
  if (!range) {
    return null;
  }

  return {
    period,
    start: range.start,
    end: range.end,
    label: String(range.year),
  };
};

type ActivityRecordRange = {
  period: ReportPeriod;
  label: string;
  start: Date;
  end: Date;
};

export const getWeeklyProductionSummary = async (
  query: WeeklyProductionQuery = {},
): Promise<ServiceResult<unknown>> => {
  const anchorDate = parseDateInput(query.date);
  if (!anchorDate) {
    return { status: 400, message: "date must be a valid date" };
  }

  const { weekStart, weekEnd } = getWeekRange(anchorDate);

  const records = await prisma.productionRecord.findMany({
    where: {
      createdAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    include: {
      machine: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      shift: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const byDay = new Map<
    string,
    {
      date: string;
      totalCartons: number;
      totalPieces: number;
      recordsCount: number;
    }
  >();
  const byShift = new Map<
    string,
    {
      shiftId: number | null;
      shiftName: string;
      totalCartons: number;
      totalPieces: number;
      downtimeMinutes: number;
      recordsCount: number;
    }
  >();
  const byMachine = new Map<
    string,
    {
      machineId: number | null;
      machineName: string;
      machineType: string | null;
      totalCartons: number;
      totalPieces: number;
      recordsCount: number;
    }
  >();

  let totalCartons = 0;
  let totalPieces = 0;
  let totalDowntimeMinutes = 0;

  for (const record of records) {
    totalCartons += record.cartonsCount;
    totalPieces += record.totalPieces;
    totalDowntimeMinutes += record.downtimeMinutes ?? 0;

    const dayKey = startOfDay(record.createdAt).toISOString().slice(0, 10);
    const dayCurrent = byDay.get(dayKey) ?? {
      date: dayKey,
      totalCartons: 0,
      totalPieces: 0,
      recordsCount: 0,
    };

    dayCurrent.totalCartons += record.cartonsCount;
    dayCurrent.totalPieces += record.totalPieces;
    dayCurrent.recordsCount += 1;
    byDay.set(dayKey, dayCurrent);

    const shiftKey = record.shift?.name ?? "UNASSIGNED";
    const shiftCurrent = byShift.get(shiftKey) ?? {
      shiftId: record.shift?.id ?? null,
      shiftName: shiftKey,
      totalCartons: 0,
      totalPieces: 0,
      downtimeMinutes: 0,
      recordsCount: 0,
    };

    shiftCurrent.totalCartons += record.cartonsCount;
    shiftCurrent.totalPieces += record.totalPieces;
    shiftCurrent.downtimeMinutes += record.downtimeMinutes ?? 0;
    shiftCurrent.recordsCount += 1;
    byShift.set(shiftKey, shiftCurrent);

    const machineKey = String(record.machine?.id ?? "none");
    const machineCurrent = byMachine.get(machineKey) ?? {
      machineId: record.machine?.id ?? null,
      machineName: record.machine?.name ?? "—",
      machineType: record.machine?.type ?? null,
      totalCartons: 0,
      totalPieces: 0,
      recordsCount: 0,
    };

    machineCurrent.totalCartons += record.cartonsCount;
    machineCurrent.totalPieces += record.totalPieces;
    machineCurrent.recordsCount += 1;
    byMachine.set(machineKey, machineCurrent);
  }

  return {
    status: 200,
    data: {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totals: {
        recordsCount: records.length,
        totalCartons,
        totalPieces,
        totalDowntimeMinutes,
      },
      byDay: Array.from(byDay.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      byShift: Array.from(byShift.values()).sort((a, b) =>
        a.shiftName.localeCompare(b.shiftName),
      ),
      byMachine: Array.from(byMachine.values()).sort((a, b) =>
        a.machineName.localeCompare(b.machineName),
      ),
    },
  };
};

export const getDailyProductionSummary = async (
  query: DailyProductionQuery = {},
): Promise<ServiceResult<unknown>> => {
  const anchorDate = parseDateInput(query.date);
  if (!anchorDate) {
    return { status: 400, message: "date must be a valid date" };
  }

  const dayStart = startOfDay(anchorDate);
  const dayEnd = endOfDay(anchorDate);

  const records = await prisma.productionRecord.findMany({
    where: {
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      machine: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      shift: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const byShift = new Map<
    string,
    {
      shiftId: number | null;
      shiftName: string;
      totalCartons: number;
      totalPieces: number;
      recordsCount: number;
    }
  >();

  let totalCartons = 0;
  let totalPieces = 0;
  let totalDowntimeMinutes = 0;

  for (const record of records) {
    totalCartons += record.cartonsCount;
    totalPieces += record.totalPieces;
    totalDowntimeMinutes += record.downtimeMinutes ?? 0;

    const shiftKey = record.shift?.name ?? "UNASSIGNED";
    const shiftCurrent = byShift.get(shiftKey) ?? {
      shiftId: record.shift?.id ?? null,
      shiftName: shiftKey,
      totalCartons: 0,
      totalPieces: 0,
      recordsCount: 0,
    };

    shiftCurrent.totalCartons += record.cartonsCount;
    shiftCurrent.totalPieces += record.totalPieces;
    shiftCurrent.recordsCount += 1;
    byShift.set(shiftKey, shiftCurrent);
  }

  return {
    status: 200,
    data: {
      day: dayStart.toISOString().slice(0, 10),
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
      totals: {
        recordsCount: records.length,
        totalCartons,
        totalPieces,
        totalDowntimeMinutes,
      },
      byShift: Array.from(byShift.values()).sort((a, b) =>
        a.shiftName.localeCompare(b.shiftName),
      ),
    },
  };
};

export const getProductionActivityReport = async (
  query: PeriodQuery = {},
): Promise<ServiceResult<unknown>> => {
  const range = resolvePeriodRange(query);
  if (!range) {
    return {
      status: 400,
      message:
        "period requires date for daily/weekly or month/year for monthly/yearly",
    };
  }

  const records = await prisma.productionRecord.findMany({
    where: {
      createdAt: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      machine: { select: { id: true, name: true, type: true } },
      shift: { select: { id: true, name: true } },
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.recordsCount += 1;
      accumulator.totalCartons += record.cartonsCount;
      accumulator.totalPieces += record.totalPieces;
      accumulator.totalDowntimeMinutes += record.downtimeMinutes ?? 0;
      return accumulator;
    },
    {
      recordsCount: 0,
      totalCartons: 0,
      totalPieces: 0,
      totalDowntimeMinutes: 0,
    },
  );

  return {
    status: 200,
    data: {
      period: range.period,
      label: range.label,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      totals,
      records: records.map((record) => ({
        id: record.id,
        createdAt: record.createdAt.toISOString(),
        machineName: record.machine?.name ?? "—",
        machineType: record.machine?.type ?? null,
        shiftName: record.shift.name,
        userName: record.user.fullName,
        username: record.user.username,
        cartonsCount: record.cartonsCount,
        piecesPerCarton: record.piecesPerCarton,
        totalPieces: record.totalPieces,
        downtimeMinutes: record.downtimeMinutes ?? 0,
        hourSlot: record.hourSlot,
        notes: record.notes,
      })),
    },
  };
};

export const getInventoryActivityReport = async (
  query: PeriodQuery = {},
): Promise<ServiceResult<unknown>> => {
  const range = resolvePeriodRange(query);
  if (!range) {
    return {
      status: 400,
      message:
        "period requires date for daily/weekly or month/year for monthly/yearly",
    };
  }

  const records = await prisma.inventoryTransaction.findMany({
    where: {
      createdAt: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      material: { select: { id: true, name: true, unit: true } },
      createdBy: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.recordsCount += 1;
      if (record.type === "IN") {
        accumulator.totalInQuantity += record.quantity;
        accumulator.inCount += 1;
      } else {
        accumulator.totalOutQuantity += record.quantity;
        accumulator.outCount += 1;
      }
      return accumulator;
    },
    {
      recordsCount: 0,
      inCount: 0,
      outCount: 0,
      totalInQuantity: 0,
      totalOutQuantity: 0,
    },
  );

  return {
    status: 200,
    data: {
      period: range.period,
      label: range.label,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      totals,
      records: records.map((record) => ({
        id: record.id,
        createdAt: record.createdAt.toISOString(),
        materialName: record.material.name,
        materialUnit: record.material.unit,
        type: record.type,
        quantity: record.quantity,
        referenceType: record.referenceType,
        referenceId: record.referenceId,
        createdByName: record.createdBy?.fullName ?? null,
        createdByUsername: record.createdBy?.username ?? null,
      })),
    },
  };
};

export const getAttendanceActivityReport = async (
  query: PeriodQuery = {},
): Promise<ServiceResult<unknown>> => {
  const range = resolvePeriodRange(query);
  if (!range) {
    return {
      status: 400,
      message:
        "period requires date for daily/weekly or month/year for monthly/yearly",
    };
  }

  const records = await prisma.attendance.findMany({
    where: {
      checkIn: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
      shift: { select: { id: true, name: true } },
    },
    orderBy: { checkIn: "asc" },
  });

  const activeUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      role: { in: ["WORKER", "ENGINEER", "ACCOUNTANT"] },
    },
    select: { id: true, fullName: true, username: true, role: true },
  });

  const attendedUserIds = new Set(records.map((item) => item.userId));
  const absentUsers = activeUsers.filter(
    (user) => !attendedUserIds.has(user.id),
  );

  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.recordsCount += 1;
      accumulator.totalLateMinutes += record.lateMinutes ?? 0;
      accumulator.totalOvertimeMinutes += record.overtimeMinutes ?? 0;
      if (record.checkOut) {
        accumulator.checkedOutCount += 1;
      } else {
        accumulator.openCount += 1;
      }
      return accumulator;
    },
    {
      recordsCount: 0,
      checkedOutCount: 0,
      openCount: 0,
      totalLateMinutes: 0,
      totalOvertimeMinutes: 0,
      absentCount: absentUsers.length,
    },
  );

  return {
    status: 200,
    data: {
      period: range.period,
      label: range.label,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      totals,
      absentUsers,
      records: records.map((record) => ({
        id: record.id,
        checkIn: record.checkIn.toISOString(),
        checkOut: record.checkOut ? record.checkOut.toISOString() : null,
        lateMinutes: record.lateMinutes,
        overtimeMinutes: record.overtimeMinutes,
        userId: record.user.id,
        userName: record.user.fullName,
        username: record.user.username,
        role: record.user.role,
        shiftName: record.shift?.name ?? null,
      })),
    },
  };
};

export const getPayrollActivityReport = async (
  query: PeriodQuery = {},
): Promise<ServiceResult<unknown>> => {
  const range = resolvePeriodRange(query);
  if (!range) {
    return {
      status: 400,
      message:
        "period requires date for daily/weekly or month/year for monthly/yearly",
    };
  }

  const records = await prisma.payroll.findMany({
    where: {
      calculatedAt: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, username: true, role: true },
      },
    },
    orderBy: { calculatedAt: "asc" },
  });

  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.recordsCount += 1;
      accumulator.totalBaseSalary += record.baseSalary ?? 0;
      accumulator.totalOvertimeSalary += record.overtimeSalary ?? 0;
      accumulator.totalPayout += record.totalSalary ?? 0;
      return accumulator;
    },
    {
      recordsCount: 0,
      totalBaseSalary: 0,
      totalOvertimeSalary: 0,
      totalPayout: 0,
    },
  );

  return {
    status: 200,
    data: {
      period: range.period,
      label: range.label,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      totals,
      records: records.map((record) => ({
        id: record.id,
        month: record.month,
        calculatedAt: record.calculatedAt.toISOString(),
        userId: record.user.id,
        userName: record.user.fullName,
        username: record.user.username,
        role: record.user.role,
        totalHours: record.totalHours,
        overtimeHours: record.overtimeHours,
        baseSalary: record.baseSalary,
        overtimeSalary: record.overtimeSalary,
        totalSalary: record.totalSalary,
      })),
    },
  };
};

export const getMonthlySalesSummary = async (
  query: MonthlySalesQuery = {},
): Promise<ServiceResult<unknown>> => {
  const range = parseMonthInput(query.month);
  if (!range) {
    return { status: 400, message: "month must be in YYYY-MM format" };
  }

  const sales = await prisma.sale.findMany({
    where: {
      date: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      items: true,
    },
    orderBy: { date: "asc" },
  });

  const byCustomer = new Map<
    string,
    {
      customerId: number;
      customerName: string;
      invoicesCount: number;
      totalAmount: number;
      itemsQuantity: number;
    }
  >();
  const byDay = new Map<
    string,
    { date: string; invoicesCount: number; totalAmount: number }
  >();

  let totalInvoices = 0;
  let totalAmount = 0;
  let totalItemsQuantity = 0;

  for (const sale of sales) {
    totalInvoices += 1;
    totalAmount += sale.totalAmount;

    const saleItemsQuantity = sale.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    totalItemsQuantity += saleItemsQuantity;

    const customerKey = String(sale.customer.id);
    const customerCurrent = byCustomer.get(customerKey) ?? {
      customerId: sale.customer.id,
      customerName: sale.customer.name,
      invoicesCount: 0,
      totalAmount: 0,
      itemsQuantity: 0,
    };

    customerCurrent.invoicesCount += 1;
    customerCurrent.totalAmount += sale.totalAmount;
    customerCurrent.itemsQuantity += saleItemsQuantity;
    byCustomer.set(customerKey, customerCurrent);

    const dayKey = startOfDay(sale.date).toISOString().slice(0, 10);
    const dayCurrent = byDay.get(dayKey) ?? {
      date: dayKey,
      invoicesCount: 0,
      totalAmount: 0,
    };

    dayCurrent.invoicesCount += 1;
    dayCurrent.totalAmount += sale.totalAmount;
    byDay.set(dayKey, dayCurrent);
  }

  return {
    status: 200,
    data: {
      month: range.label,
      monthStart: range.start.toISOString(),
      monthEnd: range.end.toISOString(),
      totals: {
        totalInvoices,
        totalAmount,
        totalItemsQuantity,
      },
      byCustomer: Array.from(byCustomer.values()).sort(
        (a, b) => b.totalAmount - a.totalAmount,
      ),
      byDay: Array.from(byDay.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    },
  };
};

export const getYearlySalesSummary = async (
  query: YearlySalesQuery = {},
): Promise<ServiceResult<unknown>> => {
  const range = parseYearInput(query.year);
  if (!range) {
    return { status: 400, message: "year must be in YYYY format" };
  }

  const sales = await prisma.sale.findMany({
    where: {
      date: {
        gte: range.start,
        lte: range.end,
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      items: true,
    },
    orderBy: { date: "asc" },
  });

  const byMonth = new Map<
    string,
    {
      month: string;
      invoicesCount: number;
      totalAmount: number;
      itemsQuantity: number;
    }
  >();

  const byCustomer = new Map<
    string,
    {
      customerId: number;
      customerName: string;
      invoicesCount: number;
      totalAmount: number;
      itemsQuantity: number;
    }
  >();

  let totalInvoices = 0;
  let totalAmount = 0;
  let totalItemsQuantity = 0;

  for (const sale of sales) {
    totalInvoices += 1;
    totalAmount += sale.totalAmount;

    const saleItemsQuantity = sale.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    totalItemsQuantity += saleItemsQuantity;

    const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, "0")}`;
    const monthCurrent = byMonth.get(monthKey) ?? {
      month: monthKey,
      invoicesCount: 0,
      totalAmount: 0,
      itemsQuantity: 0,
    };

    monthCurrent.invoicesCount += 1;
    monthCurrent.totalAmount += sale.totalAmount;
    monthCurrent.itemsQuantity += saleItemsQuantity;
    byMonth.set(monthKey, monthCurrent);

    const customerKey = String(sale.customer.id);
    const customerCurrent = byCustomer.get(customerKey) ?? {
      customerId: sale.customer.id,
      customerName: sale.customer.name,
      invoicesCount: 0,
      totalAmount: 0,
      itemsQuantity: 0,
    };

    customerCurrent.invoicesCount += 1;
    customerCurrent.totalAmount += sale.totalAmount;
    customerCurrent.itemsQuantity += saleItemsQuantity;
    byCustomer.set(customerKey, customerCurrent);
  }

  return {
    status: 200,
    data: {
      year: range.year,
      yearStart: range.start.toISOString(),
      yearEnd: range.end.toISOString(),
      totals: {
        totalInvoices,
        totalAmount,
        totalItemsQuantity,
      },
      byMonth: Array.from(byMonth.values()).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      byCustomer: Array.from(byCustomer.values()).sort(
        (a, b) => b.totalAmount - a.totalAmount,
      ),
    },
  };
};

export const getInventorySnapshot = async (
  query: InventorySnapshotQuery = {},
): Promise<ServiceResult<unknown>> => {
  const thresholdInput = query.lowStockThreshold ?? "50";
  const lowStockThreshold = Number(thresholdInput);

  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return {
      status: 400,
      message: "lowStockThreshold must be zero or a positive number",
    };
  }

  const materials = await prisma.rawMaterial.findMany({
    include: {
      transactions: {
        select: {
          id: true,
          type: true,
          quantity: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const totalQuantity = materials.reduce(
    (sum, item) => sum + item.currentQuantity,
    0,
  );
  const lowStockItems = materials
    .filter((item) => item.currentQuantity <= lowStockThreshold)
    .map((item) => ({
      id: item.id,
      name: item.name,
      currentQuantity: item.currentQuantity,
      unit: item.unit,
    }));

  return {
    status: 200,
    data: {
      generatedAt: new Date().toISOString(),
      lowStockThreshold,
      totals: {
        materialsCount: materials.length,
        totalQuantity,
        lowStockCount: lowStockItems.length,
      },
      lowStockItems,
      materials: materials.map((item) => ({
        id: item.id,
        name: item.name,
        currentQuantity: item.currentQuantity,
        unit: item.unit,
        lastTransaction: item.transactions[0] ?? null,
      })),
    },
  };
};
