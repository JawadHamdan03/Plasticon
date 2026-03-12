import { InventoryType, ReferenceType } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

type PurchaseItemPayload = {
    materialId?: number;
    quantity?: number;
    pricePerUnit?: number;
};

type CreatePurchasePayload = {
    supplierId?: number;
    invoiceImage?: string;
    date?: string;
    totalAmount?: number;
    items?: PurchaseItemPayload[];
};

export const createPurchase = async (
    userId: number,
    payload: CreatePurchasePayload = {}
): Promise<ServiceResult<unknown>> => {
    const supplierId = Number(payload.supplierId);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return { status: 400, message: "supplierId is required and must be a positive integer" };
    }

    if (!payload.invoiceImage || !payload.invoiceImage.trim()) {
        return { status: 400, message: "invoiceImage is required" };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
        return { status: 400, message: "items are required" };
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
        return { status: 404, message: "Supplier not found" };
    }

    const preparedItems: { materialId: number; quantity: number; pricePerUnit: number }[] = [];
    for (const item of payload.items) {
        const materialId = Number(item.materialId);
        const quantity = Number(item.quantity);
        const pricePerUnit = Number(item.pricePerUnit);

        if (!Number.isInteger(materialId) || materialId <= 0) {
            return { status: 400, message: "Each item materialId must be a positive integer" };
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return { status: 400, message: "Each item quantity must be a positive number" };
        }

        if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
            return { status: 400, message: "Each item pricePerUnit must be zero or a positive number" };
        }

        preparedItems.push({ materialId, quantity, pricePerUnit });
    }

    const materials = await prisma.rawMaterial.findMany({
        where: { id: { in: preparedItems.map((x) => x.materialId) } },
        select: { id: true, currentQuantity: true },
    });

    if (materials.length !== new Set(preparedItems.map((x) => x.materialId)).size) {
        return { status: 404, message: "One or more materials were not found" };
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

    const purchaseDate = payload.date ? new Date(payload.date) : new Date();
    if (Number.isNaN(purchaseDate.getTime())) {
        return { status: 400, message: "Invalid purchase date" };
    }

    const materialMap = new Map(materials.map((m) => [m.id, m]));

    const result = await prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
            data: {
                supplierId,
                receivedById: userId,
                totalAmount,
                invoiceImage: payload.invoiceImage!.trim(),
                date: purchaseDate,
            },
        });

        for (const item of preparedItems) {
            await tx.purchaseItem.create({
                data: {
                    purchaseId: purchase.id,
                    materialId: item.materialId,
                    quantity: item.quantity,
                    pricePerUnit: item.pricePerUnit,
                },
            });

            const material = materialMap.get(item.materialId)!;

            await tx.rawMaterial.update({
                where: { id: item.materialId },
                data: {
                    currentQuantity: material.currentQuantity + item.quantity,
                },
            });

            await tx.inventoryTransaction.create({
                data: {
                    materialId: item.materialId,
                    type: InventoryType.IN,
                    quantity: item.quantity,
                    referenceType: ReferenceType.PURCHASE,
                    referenceId: purchase.id,
                    createdById: userId,
                },
            });
        }

        return tx.purchase.findUnique({
            where: { id: purchase.id },
            include: {
                supplier: true,
                receivedBy: {
                    select: { id: true, fullName: true, username: true, role: true },
                },
                items: {
                    include: {
                        material: true,
                    },
                },
            },
        });
    });

    return { status: 201, data: result };
};

export const getAllPurchases = async (): Promise<ServiceResult<unknown>> => {
    const purchases = await prisma.purchase.findMany({
        include: {
            supplier: true,
            receivedBy: {
                select: { id: true, fullName: true, username: true, role: true },
            },
            items: {
                include: { material: true },
            },
        },
        orderBy: { date: "desc" },
    });

    return { status: 200, data: purchases };
};

export const getMyPurchases = async (userId: number): Promise<ServiceResult<unknown>> => {
    const purchases = await prisma.purchase.findMany({
        where: { receivedById: userId },
        include: {
            supplier: true,
            items: {
                include: { material: true },
            },
        },
        orderBy: { date: "desc" },
    });

    return { status: 200, data: purchases };
};
