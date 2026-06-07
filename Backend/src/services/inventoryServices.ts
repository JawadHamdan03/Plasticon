import {
  InventoryType,
  ReferenceType,
} from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
import { dispatchAutoNotification } from "./notificationServices";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type CreateInventoryTransactionPayload = {
  materialId?: number;
  type?: InventoryType;
  quantity?: number;
  referenceType?: ReferenceType;
  referenceId?: number;
};

export const createInventoryTransaction = async (
  userId: number,
  payload: CreateInventoryTransactionPayload = {},
): Promise<ServiceResult<unknown>> => {
  const materialId = Number(payload.materialId);
  const quantity = Number(payload.quantity);

  if (!Number.isInteger(materialId) || materialId <= 0) {
    return {
      status: 400,
      message: "materialId is required and must be a positive integer",
    };
  }

  if (!Object.values(InventoryType).includes(payload.type as InventoryType)) {
    return { status: 400, message: "Invalid inventory type" };
  }

  if (
    !Object.values(ReferenceType).includes(
      payload.referenceType as ReferenceType,
    )
  ) {
    return { status: 400, message: "Invalid reference type" };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { status: 400, message: "quantity must be a positive number" };
  }

  const material = await prisma.rawMaterial.findUnique({
    where: { id: materialId },
    select: { id: true, currentQuantity: true, name: true, unit: true },
  });

  if (!material) {
    return { status: 404, message: "Raw material not found" };
  }

  if (
    payload.type === InventoryType.OUT &&
    material.currentQuantity < quantity
  ) {
    return {
      status: 400,
      message: `Insufficient stock for ${material.name}. Available: ${material.currentQuantity} ${material.unit}`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedMaterial = await tx.rawMaterial.update({
      where: { id: material.id },
      data: {
        currentQuantity:
          payload.type === InventoryType.IN
            ? material.currentQuantity + quantity
            : material.currentQuantity - quantity,
      },
    });

    const transaction = await tx.inventoryTransaction.create({
      data: {
        materialId: material.id,
        type: payload.type as InventoryType,
        quantity,
        referenceType: payload.referenceType as ReferenceType,
        referenceId:
          payload.referenceId !== undefined && payload.referenceId !== null
            ? Number(payload.referenceId)
            : null,
        createdById: userId,
      },
      include: {
        material: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return {
      transaction,
      updatedMaterial,
    };
  });

  const auditAction =
    payload.type === InventoryType.IN
      ? AuditAction.INVENTORY_IN
      : AuditAction.INVENTORY_OUT;
  auditAsync(
    userId,
    auditAction,
    AuditEntityType.INVENTORY_TRANSACTION,
    result.transaction.id,
    {
      materialId: material.id,
      materialName: material.name,
      quantity,
      type: payload.type,
    },
  );

  void dispatchAutoNotification({
    event: "INVENTORY_TRANSACTION_CREATED",
    actorUserId: userId,
    inventoryTransactionId: result.transaction.id,
    materialName: material.name,
    quantity,
    operationType: payload.type,
  }).catch((err) => console.error("[autoNotify] inventory:", err));

  return { status: 201, data: result };
};

export const getInventoryTransactions = async (): Promise<
  ServiceResult<unknown>
> => {
  const records = await prisma.inventoryTransaction.findMany({
    include: {
      material: true,
      createdBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: records };
};

export const getMyInventoryTransactions = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const records = await prisma.inventoryTransaction.findMany({
    where: { createdById: userId },
    include: {
      material: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { status: 200, data: records };
};

export const getRawMaterialsStock = async (): Promise<
  ServiceResult<unknown>
> => {
  const materials = await prisma.rawMaterial.findMany({
    orderBy: { name: "asc" },
  });

  return { status: 200, data: materials };
};
