import { Request, Response } from "express";
import { prisma } from "../config/lib/prisma";
import { InventoryAuditFrequency, ProductType } from "../config/generated/prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const getProductionSettings = async (_req: Request, res: Response) => {
    const settings = await prisma.productionSetting.findMany({
        orderBy: { productType: "asc" },
    });
    res.status(200).json(settings);
};

export const upsertProductionSetting = async (req: AuthenticatedRequest, res: Response) => {
    const productType = req.params.productType as ProductType;
    const { piecesPerCarton } = req.body;

    if (!Object.values(ProductType).includes(productType)) {
        res.status(400).json({ message: "Invalid product type" });
        return;
    }

    const pieces = Number(piecesPerCarton);
    if (!Number.isFinite(pieces) || pieces <= 0 || !Number.isInteger(pieces)) {
        res.status(400).json({ message: "piecesPerCarton must be a positive integer" });
        return;
    }

    const setting = await prisma.productionSetting.upsert({
        where: { productType },
        update: {
            piecesPerCarton: pieces,
            updatedById: req.user?.id ?? null,
        },
        create: {
            productType,
            piecesPerCarton: pieces,
            updatedById: req.user?.id ?? null,
        },
    });

    res.status(200).json(setting);
};

export const getSystemSettings = async (_req: Request, res: Response) => {
    const setting = await prisma.systemSetting.findFirst({
        orderBy: { updatedAt: "desc" },
    });
    res.status(200).json(setting);
};

export const upsertSystemSettings = async (req: AuthenticatedRequest, res: Response) => {
    const {
        qualityCheckIntervalMinutes,
        qualityCheckReminderMinutes,
        inventoryAuditFrequency,
        shiftEndReminderMinutes,
        weeklyReportDayOfWeek,
        weeklyReportTime,
        monthlyReportDayOfMonth,
        monthlyReportTime,
    } = req.body;

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
        res.status(400).json({ message: "All system settings fields are required" });
        return;
    }

    if (!Object.values(InventoryAuditFrequency).includes(inventoryAuditFrequency)) {
        res.status(400).json({ message: "Invalid inventory audit frequency" });
        return;
    }

    const interval = Number(qualityCheckIntervalMinutes);
    const reminder = Number(qualityCheckReminderMinutes);
    const shiftReminder = Number(shiftEndReminderMinutes);
    const weeklyDay = Number(weeklyReportDayOfWeek);
    const monthlyDay = Number(monthlyReportDayOfMonth);

    if (!Number.isFinite(interval) || interval <= 0) {
        res.status(400).json({ message: "qualityCheckIntervalMinutes must be a positive number" });
        return;
    }

    if (!Number.isFinite(reminder) || reminder < 0) {
        res.status(400).json({ message: "qualityCheckReminderMinutes must be zero or a positive number" });
        return;
    }

    if (!Number.isFinite(shiftReminder) || shiftReminder <= 0) {
        res.status(400).json({ message: "shiftEndReminderMinutes must be a positive number" });
        return;
    }

    if (!Number.isFinite(weeklyDay) || weeklyDay < 1 || weeklyDay > 7) {
        res.status(400).json({ message: "weeklyReportDayOfWeek must be between 1 and 7" });
        return;
    }

    if (!Number.isFinite(monthlyDay) || monthlyDay < 1 || monthlyDay > 31) {
        res.status(400).json({ message: "monthlyReportDayOfMonth must be between 1 and 31" });
        return;
    }

    if (!isValidTime(String(weeklyReportTime)) || !isValidTime(String(monthlyReportTime))) {
        res.status(400).json({ message: "Report times must be in HH:mm format" });
        return;
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
                updatedById: req.user?.id ?? null,
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
                updatedById: req.user?.id ?? null,
            },
        });

    res.status(200).json(setting);
};
