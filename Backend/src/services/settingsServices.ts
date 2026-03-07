import { InventoryAuditFrequency, ProductType } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";

const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const getProductionSettings = async (): Promise<ServiceResult<unknown>> => {
    const settings = await prisma.productionSetting.findMany({
        orderBy: { productType: "asc" },
    });

    return { status: 200, data: settings };
};

export const upsertProductionSetting = async (
    productType: ProductType,
    piecesPerCarton: unknown,
    userId?: number
): Promise<ServiceResult<unknown>> => {
    if (!Object.values(ProductType).includes(productType)) {
        return { status: 400, message: "Invalid product type" };
    }

    const pieces = Number(piecesPerCarton);
    if (!Number.isFinite(pieces) || pieces <= 0 || !Number.isInteger(pieces)) {
        return { status: 400, message: "piecesPerCarton must be a positive integer" };
    }

    const setting = await prisma.productionSetting.upsert({
        where: { productType },
        update: {
            piecesPerCarton: pieces,
            updatedById: userId ?? null,
        },
        create: {
            productType,
            piecesPerCarton: pieces,
            updatedById: userId ?? null,
        },
    });

    return { status: 200, data: setting };
};

export const getSystemSettings = async (): Promise<ServiceResult<unknown>> => {
    const setting = await prisma.systemSetting.findFirst({
        orderBy: { updatedAt: "desc" },
    });

    return { status: 200, data: setting };
};

type SystemSettingsPayload = {
    qualityCheckIntervalMinutes?: number;
    qualityCheckReminderMinutes?: number;
    inventoryAuditFrequency?: InventoryAuditFrequency;
    shiftEndReminderMinutes?: number;
    weeklyReportDayOfWeek?: number;
    weeklyReportTime?: string;
    monthlyReportDayOfMonth?: number;
    monthlyReportTime?: string;
};

export const upsertSystemSettings = async (
    payload: SystemSettingsPayload,
    userId?: number
): Promise<ServiceResult<unknown>> => {
    const {
        qualityCheckIntervalMinutes,
        qualityCheckReminderMinutes,
        inventoryAuditFrequency,
        shiftEndReminderMinutes,
        weeklyReportDayOfWeek,
        weeklyReportTime,
        monthlyReportDayOfMonth,
        monthlyReportTime,
    } = payload;

    if (
        qualityCheckIntervalMinutes === undefined ||
        qualityCheckReminderMinutes === undefined ||
        inventoryAuditFrequency === undefined ||
        shiftEndReminderMinutes === undefined ||
        weeklyReportDayOfWeek === undefined ||
        weeklyReportTime === undefined ||
        monthlyReportDayOfMonth === undefined ||
        monthlyReportTime === undefined
    ) {
        return { status: 400, message: "All system settings fields are required" };
    }

    if (!Object.values(InventoryAuditFrequency).includes(inventoryAuditFrequency)) {
        return { status: 400, message: "Invalid inventory audit frequency" };
    }

    const interval = Number(qualityCheckIntervalMinutes);
    const reminder = Number(qualityCheckReminderMinutes);
    const shiftReminder = Number(shiftEndReminderMinutes);
    const weeklyDay = Number(weeklyReportDayOfWeek);
    const monthlyDay = Number(monthlyReportDayOfMonth);

    if (!Number.isFinite(interval) || interval <= 0) {
        return { status: 400, message: "qualityCheckIntervalMinutes must be a positive number" };
    }

    if (!Number.isFinite(reminder) || reminder < 0) {
        return { status: 400, message: "qualityCheckReminderMinutes must be zero or a positive number" };
    }

    if (!Number.isFinite(shiftReminder) || shiftReminder <= 0) {
        return { status: 400, message: "shiftEndReminderMinutes must be a positive number" };
    }

    if (!Number.isFinite(weeklyDay) || weeklyDay < 1 || weeklyDay > 7) {
        return { status: 400, message: "weeklyReportDayOfWeek must be between 1 and 7" };
    }

    if (!Number.isFinite(monthlyDay) || monthlyDay < 1 || monthlyDay > 31) {
        return { status: 400, message: "monthlyReportDayOfMonth must be between 1 and 31" };
    }

    if (!isValidTime(String(weeklyReportTime)) || !isValidTime(String(monthlyReportTime))) {
        return { status: 400, message: "Report times must be in HH:mm format" };
    }

    const existing = await prisma.systemSetting.findFirst({
        orderBy: { updatedAt: "desc" },
    });

    const setting = existing
        ? await prisma.systemSetting.update({
            where: { id: existing.id },
            data: {
                qualityCheckIntervalMinutes: interval,
                qualityCheckReminderMinutes: reminder,
                inventoryAuditFrequency,
                shiftEndReminderMinutes: shiftReminder,
                weeklyReportDayOfWeek: weeklyDay,
                weeklyReportTime: String(weeklyReportTime),
                monthlyReportDayOfMonth: monthlyDay,
                monthlyReportTime: String(monthlyReportTime),
                updatedById: userId ?? null,
            },
        })
        : await prisma.systemSetting.create({
            data: {
                qualityCheckIntervalMinutes: interval,
                qualityCheckReminderMinutes: reminder,
                inventoryAuditFrequency,
                shiftEndReminderMinutes: shiftReminder,
                weeklyReportDayOfWeek: weeklyDay,
                weeklyReportTime: String(weeklyReportTime),
                monthlyReportDayOfMonth: monthlyDay,
                monthlyReportTime: String(monthlyReportTime),
                updatedById: userId ?? null,
            },
        });

    return { status: 200, data: setting };
};
