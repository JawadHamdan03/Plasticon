import { prisma } from "../config/lib/prisma";
import { NotificationType, UserRole } from "../config/generated/prisma/client";
import { emitNotificationUnreadCountUpdate } from "../config/socket";

type ServiceResult<T> = {
    status: number;
    message?: string;
    data?: T;
};

export const getAllRawMaterials = async (): Promise<ServiceResult<unknown>> => {
    const materials = await prisma.rawMaterial.findMany({
        include: {
            alerts: true,
        },
        orderBy: { id: "asc" },
    });

    const result = materials.map((m) => {
        const alert = m.alerts[0] ?? null;
        const minQty = alert?.minQuantity ?? m.minQuantity ?? 0;
        let status = "OK";
        if (m.currentQuantity === 0) status = "CRITICAL";
        else if (m.currentQuantity < minQty) status = "LOW";

        return {
            id: m.id,
            name: m.name,
            unit: m.unit,
            currentQuantity: m.currentQuantity,
            minQuantity: minQty,
            alertId: alert?.id ?? null,
            alertActive: alert?.isActive ?? false,
            status,
        };
    });

    return { status: 200, data: result };
};

export const updateMaterialStock = async (
    id: number,
    payload: { currentQuantity: number }
): Promise<ServiceResult<unknown>> => {
    const materialId = Number(id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
        return { status: 400, message: "Invalid material id" };
    }

    const qty = Number(payload.currentQuantity);
    if (!Number.isFinite(qty) || qty < 0) {
        return { status: 400, message: "currentQuantity must be a non-negative number" };
    }

    const material = await prisma.rawMaterial.findUnique({ where: { id: materialId }, include: { alerts: true } });
    if (!material) {
        return { status: 404, message: "Material not found" };
    }

    const updated = await prisma.rawMaterial.update({
        where: { id: materialId },
        data: { currentQuantity: qty },
    });

    const alert = material.alerts[0] ?? null;
    const minQty = alert?.minQuantity ?? material.minQuantity ?? 0;

    if (qty < minQty) {
        const targetUsers = await prisma.user.findMany({
            where: { role: { in: [UserRole.ENGINEER, UserRole.ACCOUNTANT] } },
            select: { id: true },
        });

        if (targetUsers.length > 0) {
            await prisma.notification.createMany({
                data: targetUsers.map((u) => ({
                    userId: u.id,
                    title: "Low Stock Alert",
                    message: `${material.name} stock is low: ${qty} ${material.unit} (min: ${minQty})`,
                    type: NotificationType.RAW_MATERIAL_ALERT,
                })),
            });

            targetUsers.forEach((u) => {
                emitNotificationUnreadCountUpdate(u.id, { refresh: true });
            });
        }
    }

    return { status: 200, data: updated };
};

export const setAlertThreshold = async (
    materialId: number,
    minQuantity: number
): Promise<ServiceResult<unknown>> => {
    const matId = Number(materialId);
    const minQty = Number(minQuantity);

    if (!Number.isInteger(matId) || matId <= 0) {
        return { status: 400, message: "Invalid materialId" };
    }
    if (!Number.isFinite(minQty) || minQty < 0) {
        return { status: 400, message: "minQuantity must be a non-negative number" };
    }

    const material = await prisma.rawMaterial.findUnique({ where: { id: matId } });
    if (!material) {
        return { status: 404, message: "Material not found" };
    }

    const existing = await prisma.rawMaterialAlert.findFirst({ where: { materialId: matId } });

    let alert;
    if (existing) {
        alert = await prisma.rawMaterialAlert.update({
            where: { id: existing.id },
            data: { minQuantity: minQty, isActive: true },
        });
    } else {
        alert = await prisma.rawMaterialAlert.create({
            data: { materialId: matId, minQuantity: minQty, isActive: true },
        });
    }

    // also update minQuantity on the material itself
    await prisma.rawMaterial.update({ where: { id: matId }, data: { minQuantity: minQty } });

    return { status: 200, data: alert };
};
