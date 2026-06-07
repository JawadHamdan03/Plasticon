import { FileType, NotificationType } from "../config/generated/prisma/client";
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

type SaleItemPayload = {
  machineType?: string;
  size?: string;
  quantity?: number;
  pricePerUnit?: number;
};

type CreateSalePayload = {
  customerId?: number;
  customerName?: string;
  invoiceImage?: string;
  date?: string;
  totalAmount?: number;
  items?: SaleItemPayload[];
  invoiceFile?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  };
};

type UpdateSalePayload = {
  customerId?: number;
  customerName?: string;
  invoiceImage?: string;
  date?: string;
  totalAmount?: number;
  items?: SaleItemPayload[];
  invoiceFile?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  };
};

const classifyProductType = (value?: string | null): "CAPS" | "PREFORM" | "OTHER" => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "PREFORM" || normalized.includes("PREFORM") || normalized.includes("PET")) return "PREFORM";
  if (normalized === "CAPS" || normalized.includes("CAP")) return "CAPS";
  return "OTHER";
};

const prepareSaleItems = (items: SaleItemPayload[]) => {
  const preparedItems: {
    machineType: string;
    size: string;
    quantity: number;
    pricePerUnit: number;
  }[] = [];

  for (const item of items) {
    const machineType = item.machineType?.trim();
    const size = item.size?.trim();
    const quantity = Number(item.quantity);
    const pricePerUnit = Number(item.pricePerUnit);

    if (!machineType) {
      return { message: "Each item machineType is required" };
    }

    if (!size) {
      return { message: "Each item size is required" };
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        message: "Each item quantity must be a positive number",
      };
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return {
        message: "Each item pricePerUnit must be zero or a positive number",
      };
    }

    preparedItems.push({ machineType, size, quantity, pricePerUnit });
  }

  return { items: preparedItems };
};

const notifyAdminsForAccountantSaleAction = async (
  actorUserId: number,
  title: string,
  message: string,
) => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, role: true },
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

export const createSale = async (
  userId: number,
  payload: CreateSalePayload = {},
): Promise<ServiceResult<unknown>> => {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { status: 400, message: "items are required" };
  }

  // Resolve customer: accept free-text name (find or create) or legacy customerId
  let resolvedCustomerId: number;
  const customerNameRaw = (payload.customerName ?? "").toString().trim();
  if (customerNameRaw) {
    let customer = await prisma.customer.findFirst({
      where: { name: { equals: customerNameRaw, mode: "insensitive" }, deletedAt: null },
    });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: customerNameRaw } });
    }
    resolvedCustomerId = customer.id;
  } else {
    const cid = Number(payload.customerId);
    if (!Number.isInteger(cid) || cid <= 0) {
      return { status: 400, message: "customerName or customerId is required" };
    }
    const customer = await prisma.customer.findUnique({ where: { id: cid } });
    if (!customer) return { status: 404, message: "Customer not found" };
    resolvedCustomerId = cid;
  }

  const prepared = prepareSaleItems(payload.items);
  if (!prepared.items) {
    return { status: 400, message: prepared.message };
  }
  const preparedItems = prepared.items;

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

  const saleDate = payload.date ? new Date(payload.date) : new Date();
  if (Number.isNaN(saleDate.getTime())) {
    return { status: 400, message: "Invalid sale date" };
  }

  // ── Finished-goods stock validation ──────────────────────────────────
  {
    const [allProductions, allSaleItems] = await Promise.all([
      prisma.productionRecord.findMany({
        select: { totalPieces: true, machine: { select: { type: true } } },
      }),
      prisma.saleItem.findMany({ select: { machineType: true, quantity: true } }),
    ]);

    let capsProduced = 0, preformProduced = 0;
    for (const p of allProductions) {
      const t = classifyProductType(p.machine?.type);
      if (t === "CAPS") capsProduced += p.totalPieces;
      else if (t === "PREFORM") preformProduced += p.totalPieces;
    }

    let capsSold = 0, preformSold = 0;
    for (const item of allSaleItems) {
      const t = classifyProductType(item.machineType);
      if (t === "CAPS") capsSold += item.quantity;
      else if (t === "PREFORM") preformSold += item.quantity;
    }

    let newCaps = 0, newPreform = 0;
    for (const item of preparedItems) {
      const t = classifyProductType(item.machineType);
      if (t === "CAPS") newCaps += item.quantity;
      else if (t === "PREFORM") newPreform += item.quantity;
    }

    const availableCaps = Math.max(0, capsProduced - capsSold);
    const availablePreform = Math.max(0, preformProduced - preformSold);

    if (newCaps > 0 && newCaps > availableCaps) {
      return {
        status: 400,
        message: `Insufficient CAPS stock. Available: ${availableCaps.toLocaleString()} pcs, Requested: ${newCaps.toLocaleString()} pcs`,
      };
    }
    if (newPreform > 0 && newPreform > availablePreform) {
      return {
        status: 400,
        message: `Insufficient PREFORM stock. Available: ${availablePreform.toLocaleString()} pcs, Requested: ${newPreform.toLocaleString()} pcs`,
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customerId: resolvedCustomerId,
        soldById: userId,
        totalAmount,
        invoiceImage: payload.invoiceImage?.trim() ?? "",
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

    if (payload.invoiceFile) {
      await tx.fileAttachment.create({
        data: {
          fileName: payload.invoiceFile.fileName,
          filePath: payload.invoiceFile.filePath,
          fileSize: payload.invoiceFile.fileSize,
          mimeType: payload.invoiceFile.mimeType,
          fileType: FileType.INVOICE,
          userId,
          saleId: sale.id,
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
        fileAttachments: true,
      },
    });
  });

  auditAsync(
    userId,
    AuditAction.SALE_CREATED,
    AuditEntityType.SALE,
    result?.id,
    {
      customerId: resolvedCustomerId,
      totalAmount,
      itemCount: preparedItems.length,
    },
  );

  void dispatchAutoNotification({
    event: "SALE_CREATED",
    actorUserId: userId,
    saleId: result?.id,
    totalAmount,
  }).catch((err) => console.error("[autoNotify] sale:", err));

  return { status: 201, data: result };
};

export const updateSale = async (
  userId: number,
  saleId: number,
  payload: UpdateSalePayload = {},
): Promise<ServiceResult<unknown>> => {
  const existingSale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!existingSale) {
    return { status: 404, message: "Sale not found" };
  }

  // Resolve customer for update: accept free-text name, id, or keep existing
  let resolvedCustomerId: number;
  const customerNameRaw = (payload.customerName ?? "").toString().trim();
  if (customerNameRaw) {
    let customer = await prisma.customer.findFirst({
      where: { name: { equals: customerNameRaw, mode: "insensitive" }, deletedAt: null },
    });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: customerNameRaw } });
    }
    resolvedCustomerId = customer.id;
  } else if (payload.customerId !== undefined) {
    const cid = Number(payload.customerId);
    if (!Number.isInteger(cid) || cid <= 0) {
      return { status: 400, message: "customerId must be a positive integer" };
    }
    const customer = await prisma.customer.findUnique({ where: { id: cid } });
    if (!customer) return { status: 404, message: "Customer not found" };
    resolvedCustomerId = cid;
  } else {
    resolvedCustomerId = existingSale.customerId;
  }

  let nextItems = existingSale.items.map((item) => ({
    machineType: item.machineType,
    size: item.size,
    quantity: item.quantity,
    pricePerUnit: item.pricePerUnit,
  }));

  if (payload.items !== undefined) {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { status: 400, message: "items must be a non-empty array" };
    }

    const prepared = prepareSaleItems(payload.items);
    if (!prepared.items) {
      return { status: 400, message: prepared.message };
    }
    nextItems = prepared.items;
  }

  const saleDate = payload.date ? new Date(payload.date) : existingSale.date;
  if (Number.isNaN(saleDate.getTime())) {
    return { status: 400, message: "Invalid sale date" };
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
    payload.invoiceImage?.trim() || existingSale.invoiceImage;

  const result = await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: {
        customerId: resolvedCustomerId,
        totalAmount,
        invoiceImage,
        date: saleDate,
      },
    });

    if (payload.items !== undefined) {
      await tx.saleItem.deleteMany({ where: { saleId } });
      for (const item of nextItems) {
        await tx.saleItem.create({
          data: {
            saleId,
            machineType: item.machineType,
            size: item.size,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
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
          saleId,
        },
      });
    }

    return tx.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        soldBy: {
          select: { id: true, fullName: true, username: true, role: true },
        },
        items: true,
        fileAttachments: true,
      },
    });
  });

  auditAsync(userId, AuditAction.SALE_UPDATED, AuditEntityType.SALE, saleId, {
    customerId: resolvedCustomerId,
    totalAmount,
    itemCount: nextItems.length,
  });

  await notifyAdminsForAccountantSaleAction(
    userId,
    "Sale updated by accountant",
    `Sale #${saleId} was updated by accountant #${userId}.`,
  );

  return { status: 200, data: result };
};

export const deleteSale = async (
  userId: number,
  saleId: number,
): Promise<ServiceResult<{ message: string }>> => {
  const existingSale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!existingSale) {
    return { status: 404, message: "Sale not found" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.fileAttachment.deleteMany({ where: { saleId } });
    await tx.saleItem.deleteMany({ where: { saleId } });
    await tx.sale.delete({ where: { id: saleId } });
  });

  auditAsync(userId, AuditAction.SALE_DELETED, AuditEntityType.SALE, saleId, {
    totalAmount: existingSale.totalAmount,
    itemCount: existingSale.items.length,
  });

  await notifyAdminsForAccountantSaleAction(
    userId,
    "Sale deleted by accountant",
    `Sale #${saleId} was deleted by accountant #${userId}.`,
  );

  return { status: 200, data: { message: "Sale deleted" } };
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
      fileAttachments: true,
    },
    orderBy: { date: "desc" },
  });

  return { status: 200, data: sales };
};

export const getMySales = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const sales = await prisma.sale.findMany({
    where: { soldById: userId },
    include: {
      customer: true,
      items: true,
      aiAnalysis: true,
      fileAttachments: true,
    },
    orderBy: { date: "desc" },
  });

  return { status: 200, data: sales };
};

export const getSalesAdminOverview = async (): Promise<
  ServiceResult<unknown>
> => {
  const sales = await prisma.sale.findMany({
    include: {
      soldBy: {
        select: { id: true, fullName: true, username: true, role: true },
      },
      customer: {
        select: { id: true, name: true },
      },
      items: true,
      fileAttachments: true,
    },
    orderBy: { date: "desc" },
  });

  const totals = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0),
    totalItems: sales.reduce((sum, sale) => sum + sale.items.length, 0),
  };

  const bySellerMap = new Map<
    number,
    {
      userId: number;
      fullName: string;
      username: string;
      role: string;
      salesCount: number;
      totalAmount: number;
    }
  >();

  for (const sale of sales) {
    const seller = sale.soldBy;
    const current = bySellerMap.get(seller.id) ?? {
      userId: seller.id,
      fullName: seller.fullName,
      username: seller.username,
      role: seller.role,
      salesCount: 0,
      totalAmount: 0,
    };

    current.salesCount += 1;
    current.totalAmount += sale.totalAmount ?? 0;
    bySellerMap.set(seller.id, current);
  }

  return {
    status: 200,
    data: {
      totals,
      bySeller: Array.from(bySellerMap.values()).sort(
        (a, b) => b.totalAmount - a.totalAmount,
      ),
      recentSales: sales.slice(0, 25),
    },
  };
};

export const getCustomerOptions = async (): Promise<ServiceResult<unknown>> => {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return { status: 200, data: customers };
};
