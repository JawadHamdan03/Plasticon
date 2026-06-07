import {
  FileType,
  InventoryType,
  NotificationType,
  ReferenceType,
} from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditAction, AuditEntityType } from "./auditServices";
import { dispatchAutoNotification } from "./notificationServices";

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
  supplierName?: string;
  invoiceImage?: string;
  date?: string;
  totalAmount?: number;
  items?: PurchaseItemPayload[];
  invoiceFile?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  };
};

type UpdatePurchasePayload = {
  supplierId?: number;
  supplierName?: string;
  invoiceImage?: string;
  date?: string;
  totalAmount?: number;
  items?: PurchaseItemPayload[];
  invoiceFile?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  };
};

const preparePurchaseItems = (items: PurchaseItemPayload[]) => {
  const preparedItems: {
    materialId: number;
    quantity: number;
    pricePerUnit: number;
  }[] = [];

  for (const item of items) {
    const materialId = Number(item.materialId);
    const quantity = Number(item.quantity);
    const pricePerUnit = Number(item.pricePerUnit);

    if (!Number.isInteger(materialId) || materialId <= 0) {
      return { message: "Each item materialId must be a positive integer" };
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { message: "Each item quantity must be a positive number" };
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return {
        message: "Each item pricePerUnit must be zero or a positive number",
      };
    }

    preparedItems.push({ materialId, quantity, pricePerUnit });
  }

  return { items: preparedItems };
};

const notifyAdminsForAccountantPurchaseAction = async (
  actorUserId: number,
  title: string,
  message: string,
) => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, fullName: true, role: true },
  });

  if (!actor || actor.role !== "ACCOUNTANT") {
    return;
  }

  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (admins.length === 0) {
    return;
  }

  const notifications = await prisma.$transaction(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          userId: admin.id,
          title,
          message,
          type: NotificationType.SYSTEM_MESSAGE,
        },
      }),
    ),
  );

  notifications.forEach((notification) => {
    emitNotificationToUser(notification.userId, notification);
    emitNotificationUnreadCountUpdate(notification.userId, { refresh: true });
  });
};

export const createPurchase = async (
  userId: number,
  payload: CreatePurchasePayload = {},
): Promise<ServiceResult<unknown>> => {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { status: 400, message: "items are required" };
  }

  // Resolve supplier: accept free-text name (find or create) or legacy supplierId
  let resolvedSupplierId: number;
  const supplierNameRaw = (payload.supplierName ?? "").toString().trim();
  if (supplierNameRaw) {
    let supplier = await prisma.supplier.findFirst({
      where: { name: { equals: supplierNameRaw, mode: "insensitive" }, deletedAt: null },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({ data: { name: supplierNameRaw } });
    }
    resolvedSupplierId = supplier.id;
  } else {
    const sid = Number(payload.supplierId);
    if (!Number.isInteger(sid) || sid <= 0) {
      return { status: 400, message: "supplierName or supplierId is required" };
    }
    const supplier = await prisma.supplier.findUnique({ where: { id: sid } });
    if (!supplier) return { status: 404, message: "Supplier not found" };
    resolvedSupplierId = sid;
  }

  const prepared = preparePurchaseItems(payload.items);
  if (!prepared.items) {
    return { status: 400, message: prepared.message };
  }
  const preparedItems = prepared.items;

  const materials = await prisma.rawMaterial.findMany({
    where: { id: { in: preparedItems.map((x) => x.materialId) } },
    select: { id: true, currentQuantity: true },
  });

  if (
    materials.length !== new Set(preparedItems.map((x) => x.materialId)).size
  ) {
    return { status: 404, message: "One or more materials were not found" };
  }

  const computedTotalAmount = preparedItems.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0,
  );

  const totalAmount =
    payload.totalAmount !== undefined && payload.totalAmount !== null
      ? Number(payload.totalAmount)
      : computedTotalAmount;

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return {
      status: 400,
      message: "totalAmount must be zero or a positive number",
    };
  }

  const purchaseDate = payload.date ? new Date(payload.date) : new Date();
  if (Number.isNaN(purchaseDate.getTime())) {
    return { status: 400, message: "Invalid purchase date" };
  }

  const materialMap = new Map(materials.map((m) => [m.id, m]));

  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierId: resolvedSupplierId,
        receivedById: userId,
        totalAmount,
        invoiceImage: payload.invoiceImage?.trim() ?? "",
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

    if (payload.invoiceFile) {
      await tx.fileAttachment.create({
        data: {
          fileName: payload.invoiceFile.fileName,
          filePath: payload.invoiceFile.filePath,
          fileSize: payload.invoiceFile.fileSize,
          mimeType: payload.invoiceFile.mimeType,
          fileType: FileType.INVOICE,
          userId,
          purchaseId: purchase.id,
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

  auditAsync(
    userId,
    AuditAction.PURCHASE_CREATED,
    AuditEntityType.PURCHASE,
    result?.id ?? undefined,
    {
      supplierId: resolvedSupplierId,
      totalAmount,
      itemCount: preparedItems.length,
    },
  );

  void dispatchAutoNotification({
    event: "PURCHASE_CREATED",
    actorUserId: userId,
    purchaseId: result?.id,
    totalAmount,
  }).catch((err) => console.error("[autoNotify] purchase:", err));

  return { status: 201, data: result };
};

export const updatePurchase = async (
  userId: number,
  purchaseId: number,
  payload: UpdatePurchasePayload = {},
): Promise<ServiceResult<unknown>> => {
  const existingPurchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      items: true,
    },
  });

  if (!existingPurchase) {
    return { status: 404, message: "Purchase not found" };
  }

  let nextItems = existingPurchase.items.map((item) => ({
    materialId: item.materialId,
    quantity: item.quantity,
    pricePerUnit: item.pricePerUnit,
  }));

  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { status: 400, message: "items must be a non-empty array" };
    }

    const prepared = preparePurchaseItems(payload.items);
    if (!prepared.items) {
      return { status: 400, message: prepared.message };
    }
    nextItems = prepared.items;
  }

  const materialIds = new Set<number>();
  existingPurchase.items.forEach((item) => materialIds.add(item.materialId));
  nextItems.forEach((item) => materialIds.add(item.materialId));

  const materials = await prisma.rawMaterial.findMany({
    where: { id: { in: Array.from(materialIds.values()) } },
    select: { id: true, currentQuantity: true },
  });
  const materialMap = new Map(
    materials.map((item) => [item.id, item.currentQuantity]),
  );

  if (materials.length !== materialIds.size) {
    return { status: 404, message: "One or more materials were not found" };
  }

  const oldByMaterial = new Map<number, number>();
  for (const item of existingPurchase.items) {
    oldByMaterial.set(
      item.materialId,
      (oldByMaterial.get(item.materialId) ?? 0) + item.quantity,
    );
  }

  const nextByMaterial = new Map<number, number>();
  for (const item of nextItems) {
    nextByMaterial.set(
      item.materialId,
      (nextByMaterial.get(item.materialId) ?? 0) + item.quantity,
    );
  }

  for (const materialId of materialIds) {
    const currentQuantity = materialMap.get(materialId) ?? 0;
    const oldQty = oldByMaterial.get(materialId) ?? 0;
    const nextQty = nextByMaterial.get(materialId) ?? 0;
    const adjustedQuantity = currentQuantity - oldQty + nextQty;
    if (adjustedQuantity < 0) {
      return {
        status: 400,
        message: `Updating this purchase would make material #${materialId} stock negative`,
      };
    }
  }

  // Resolve supplier for update: accept free-text name, id, or keep existing
  let resolvedSupplierId: number;
  const supplierNameRaw = (payload.supplierName ?? "").toString().trim();
  if (supplierNameRaw) {
    let supplier = await prisma.supplier.findFirst({
      where: { name: { equals: supplierNameRaw, mode: "insensitive" }, deletedAt: null },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({ data: { name: supplierNameRaw } });
    }
    resolvedSupplierId = supplier.id;
  } else if (payload.supplierId !== undefined) {
    const sid = Number(payload.supplierId);
    if (!Number.isInteger(sid) || sid <= 0) {
      return { status: 400, message: "supplierId must be a positive integer" };
    }
    const supplier = await prisma.supplier.findUnique({ where: { id: sid } });
    if (!supplier) return { status: 404, message: "Supplier not found" };
    resolvedSupplierId = sid;
  } else {
    resolvedSupplierId = existingPurchase.supplierId;
  }

  const purchaseDate = payload.date
    ? new Date(payload.date)
    : existingPurchase.date;
  if (Number.isNaN(purchaseDate.getTime())) {
    return { status: 400, message: "Invalid purchase date" };
  }

  const computedTotalAmount = nextItems.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0,
  );
  const totalAmount =
    payload.totalAmount !== undefined
      ? Number(payload.totalAmount)
      : computedTotalAmount;

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return {
      status: 400,
      message: "totalAmount must be zero or a positive number",
    };
  }

  const invoiceImage =
    payload.invoiceImage?.trim() || existingPurchase.invoiceImage;

  const result = await prisma.$transaction(async (tx) => {
    for (const materialId of materialIds) {
      const currentQuantity = materialMap.get(materialId) ?? 0;
      const oldQty = oldByMaterial.get(materialId) ?? 0;
      const nextQty = nextByMaterial.get(materialId) ?? 0;
      const adjustedQuantity = currentQuantity - oldQty + nextQty;

      await tx.rawMaterial.update({
        where: { id: materialId },
        data: { currentQuantity: adjustedQuantity },
      });
    }

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        supplierId: resolvedSupplierId,
        totalAmount,
        invoiceImage,
        date: purchaseDate,
      },
    });

    if (payload.items !== undefined) {
      await tx.purchaseItem.deleteMany({ where: { purchaseId } });
      for (const item of nextItems) {
        await tx.purchaseItem.create({
          data: {
            purchaseId,
            materialId: item.materialId,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
          },
        });
      }

      await tx.inventoryTransaction.deleteMany({
        where: {
          referenceType: ReferenceType.PURCHASE,
          referenceId: purchaseId,
        },
      });

      for (const item of nextItems) {
        await tx.inventoryTransaction.create({
          data: {
            materialId: item.materialId,
            type: InventoryType.IN,
            quantity: item.quantity,
            referenceType: ReferenceType.PURCHASE,
            referenceId: purchaseId,
            createdById: userId,
          },
        });
      }
    }

    if (payload.invoiceFile) {
      await tx.fileAttachment.create({
        data: {
          fileName: payload.invoiceFile.fileName,
          filePath: payload.invoiceFile.filePath,
          fileSize: payload.invoiceFile.fileSize,
          mimeType: payload.invoiceFile.mimeType,
          fileType: FileType.INVOICE,
          userId,
          purchaseId,
        },
      });
    }

    return tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: true,
        receivedBy: {
          select: { id: true, fullName: true, username: true, role: true },
        },
        items: {
          include: { material: true },
        },
        fileAttachments: true,
      },
    });
  });

  auditAsync(
    userId,
    AuditAction.PURCHASE_UPDATED,
    AuditEntityType.PURCHASE,
    purchaseId,
    {
      supplierId: resolvedSupplierId,
      totalAmount,
      itemCount: nextItems.length,
    },
  );

  await notifyAdminsForAccountantPurchaseAction(
    userId,
    "Purchase updated by accountant",
    `Purchase #${purchaseId} was updated by accountant #${userId}.`,
  );

  return { status: 200, data: result };
};

export const deletePurchase = async (
  userId: number,
  purchaseId: number,
): Promise<ServiceResult<{ message: string }>> => {
  const existingPurchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true },
  });

  if (!existingPurchase) {
    return { status: 404, message: "Purchase not found" };
  }

  const materialIds = Array.from(
    new Set(existingPurchase.items.map((item) => item.materialId)),
  );
  const materials = await prisma.rawMaterial.findMany({
    where: { id: { in: materialIds } },
    select: { id: true, currentQuantity: true },
  });
  const materialMap = new Map(
    materials.map((item) => [item.id, item.currentQuantity]),
  );

  for (const item of existingPurchase.items) {
    const current = materialMap.get(item.materialId) ?? 0;
    if (current - item.quantity < 0) {
      return {
        status: 400,
        message: `Cannot delete purchase because material #${item.materialId} stock would become negative`,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of existingPurchase.items) {
      const current = materialMap.get(item.materialId) ?? 0;
      await tx.rawMaterial.update({
        where: { id: item.materialId },
        data: { currentQuantity: current - item.quantity },
      });
    }

    await tx.inventoryTransaction.deleteMany({
      where: {
        referenceType: ReferenceType.PURCHASE,
        referenceId: purchaseId,
      },
    });

    await tx.fileAttachment.deleteMany({ where: { purchaseId } });
    await tx.purchaseItem.deleteMany({ where: { purchaseId } });
    await tx.purchase.delete({ where: { id: purchaseId } });
  });

  auditAsync(
    userId,
    AuditAction.PURCHASE_DELETED,
    AuditEntityType.PURCHASE,
    purchaseId,
    {
      totalAmount: existingPurchase.totalAmount,
      itemCount: existingPurchase.items.length,
    },
  );

  await notifyAdminsForAccountantPurchaseAction(
    userId,
    "Purchase deleted by accountant",
    `Purchase #${purchaseId} was deleted by accountant #${userId}.`,
  );

  return { status: 200, data: { message: "Purchase deleted" } };
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

export const getMyPurchases = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
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

export const getSupplierOptions = async (): Promise<ServiceResult<unknown>> => {
  const suppliers = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return { status: 200, data: suppliers };
};
