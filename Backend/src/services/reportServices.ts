import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

type WeeklyProductionQuery = {
    date?: string;
};

type MonthlySalesQuery = {
    month?: string;
};

type InventorySnapshotQuery = {
    lowStockThreshold?: string;
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

const parseMonthInput = (input?: string): { start: Date; end: Date; label: string } | null => {
    if (!input) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

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

    if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
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

const getWeekRange = (anchorDate: Date): { weekStart: Date; weekEnd: Date } => {
    const normalized = startOfDay(anchorDate);
    const day = normalized.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = addDays(normalized, diffToMonday);
    const weekEnd = endOfDay(addDays(weekStart, 6));
    return { weekStart, weekEnd };
};

export const getWeeklyProductionSummary = async (
    query: WeeklyProductionQuery = {}
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

    const byDay = new Map<string, { date: string; totalCartons: number; totalPieces: number; recordsCount: number }>();
    const byShift = new Map<string, { shiftId: number | null; shiftName: string; totalCartons: number; totalPieces: number; downtimeMinutes: number; recordsCount: number }>();
    const byMachine = new Map<string, { machineId: number; machineName: string; machineType: string; totalCartons: number; totalPieces: number; recordsCount: number }>();

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

        const machineKey = String(record.machine.id);
        const machineCurrent = byMachine.get(machineKey) ?? {
            machineId: record.machine.id,
            machineName: record.machine.name,
            machineType: record.machine.type,
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
            byDay: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
            byShift: Array.from(byShift.values()).sort((a, b) => a.shiftName.localeCompare(b.shiftName)),
            byMachine: Array.from(byMachine.values()).sort((a, b) => a.machineName.localeCompare(b.machineName)),
        },
    };
};

export const getMonthlySalesSummary = async (
    query: MonthlySalesQuery = {}
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

    const byCustomer = new Map<string, { customerId: number; customerName: string; invoicesCount: number; totalAmount: number; itemsQuantity: number }>();
    const byDay = new Map<string, { date: string; invoicesCount: number; totalAmount: number }>();

    let totalInvoices = 0;
    let totalAmount = 0;
    let totalItemsQuantity = 0;

    for (const sale of sales) {
        totalInvoices += 1;
        totalAmount += sale.totalAmount;

        const saleItemsQuantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
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
            byCustomer: Array.from(byCustomer.values()).sort((a, b) => b.totalAmount - a.totalAmount),
            byDay: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
        },
    };
};

export const getInventorySnapshot = async (
    query: InventorySnapshotQuery = {}
): Promise<ServiceResult<unknown>> => {
    const thresholdInput = query.lowStockThreshold ?? "50";
    const lowStockThreshold = Number(thresholdInput);

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
        return { status: 400, message: "lowStockThreshold must be zero or a positive number" };
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

    const totalQuantity = materials.reduce((sum, item) => sum + item.currentQuantity, 0);
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