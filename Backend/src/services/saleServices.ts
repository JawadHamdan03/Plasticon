import { prisma } from "../config/lib/prisma";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

type SaleItemPayload = {
    machineType?: string;
    size?: string;
    quantity?: number;
    pricePerUnit?: number;
};

type CreateSalePayload = {
    customerId?: number;
    invoiceImage?: string;
    date?: string;
    totalAmount?: number;
    items?: SaleItemPayload[];
};

export const createSale = async (
    userId: number,
    payload: CreateSalePayload = {}
): Promise<ServiceResult<unknown>> => {
    const customerId = Number(payload.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
        return { status: 400, message: "customerId is required and must be a positive integer" };
    }

    if (!payload.invoiceImage || !payload.invoiceImage.trim()) {
        return { status: 400, message: "invoiceImage is required" };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
        return { status: 400, message: "items are required" };
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
        return { status: 404, message: "Customer not found" };
    }

    const preparedItems: { machineType: string; size: string; quantity: number; pricePerUnit: number }[] = [];

    for (const item of payload.items) {
        const machineType = item.machineType?.trim();
        const size = item.size?.trim();
        const quantity = Number(item.quantity);
        const pricePerUnit = Number(item.pricePerUnit);

        if (!machineType) {
            return { status: 400, message: "Each item machineType is required" };
        }

        if (!size) {
            return { status: 400, message: "Each item size is required" };
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return { status: 400, message: "Each item quantity must be a positive number" };
        }

        if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
            return { status: 400, message: "Each item pricePerUnit must be zero or a positive number" };
        }

        preparedItems.push({ machineType, size, quantity, pricePerUnit });
    }

    const computedTotalAmount = preparedItems.reduce(
        (sum, item) => sum + item.quantity * item.pricePerUnit,
        0
    );

    const totalAmount =
        payload.totalAmount !== undefined && payload.totalAmount !== null
            ? Number(payload.totalAmount)
            : computedTotalAmount;

    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
        return { status: 400, message: "totalAmount must be zero or a positive number" };
    }

    const saleDate = payload.date ? new Date(payload.date) : new Date();
    if (Number.isNaN(saleDate.getTime())) {
        return { status: 400, message: "Invalid sale date" };
    }

    const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
            data: {
                customerId,
                soldById: userId,
                totalAmount,
                invoiceImage: payload.invoiceImage!.trim(),
                date: saleDate,
            },
        });

        for (const item of preparedItems) {
            await tx.saleItem.create({
                data: {
                    saleId: sale.id,
                    machineType: item.machineType,
                    size: item.size,
                    quantity: item.quantity,
                    pricePerUnit: item.pricePerUnit,
                },
            });
        }

        return tx.sale.findUnique({
            where: { id: sale.id },
            include: {
                customer: true,
                soldBy: {
                    select: { id: true, fullName: true, username: true, role: true },
                },
                items: true,
            },
        });
    });

    auditAsync(userId, AuditAction.SALE_CREATED, AuditEntityType.SALE, result?.id ?? null, {
        customerId,
        totalAmount,
        itemCount: preparedItems.length,
    });

    return { status: 201, data: result };
};

export const getAllSales = async (): Promise<ServiceResult<unknown>> => {
    const sales = await prisma.sale.findMany({
        include: {
            customer: true,
            soldBy: {
                select: { id: true, fullName: true, username: true, role: true },
            },
            items: true,
            aiAnalysis: true,
        },
        orderBy: { date: "desc" },
    });

    return { status: 200, data: sales };
};

export const getMySales = async (userId: number): Promise<ServiceResult<unknown>> => {
    const sales = await prisma.sale.findMany({
        where: { soldById: userId },
        include: {
            customer: true,
            items: true,
            aiAnalysis: true,
        },
        orderBy: { date: "desc" },
    });

    return { status: 200, data: sales };
};
