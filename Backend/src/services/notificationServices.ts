import { NotificationType } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import {
  emitNotificationToUser,
  emitNotificationUnreadCountUpdate,
} from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditEntityType } from "./auditServices";
import { getNotificationRuleForEvent } from "./notificationRuleSettings";
import { sendPushToUsers } from "./pushService";

type ServiceResult<T> = {
  status: number;
  message?: string;
  data?: T;
};

type ListNotificationsQuery = {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
};

type CreateNotificationPayload = {
  title?: string;
  message?: string;
  type?: NotificationType;
  targetType?: "USER" | "SHIFT" | "ALL" | "ROLE";
  shiftId?: number;
  userId?: number;
  userIds?: number[];
  role?: string;
  chatGroupId?: number;
  machineId?: number;
  productionId?: number;
};

type AutoNotificationEvent =
  | {
      event: "PRODUCTION_CREATED";
      actorUserId: number;
      shiftId?: number | null;
      productionId?: number;
      totalPieces?: number;
    }
  | {
      event: "PURCHASE_CREATED";
      actorUserId: number;
      purchaseId?: number;
      totalAmount?: number;
    }
  | {
      event: "SALE_CREATED";
      actorUserId: number;
      saleId?: number;
      totalAmount?: number;
    }
  | {
      event: "INVENTORY_TRANSACTION_CREATED";
      actorUserId: number;
      inventoryTransactionId?: number;
      materialName?: string;
      quantity?: number;
      operationType?: string;
    };

const NOTIFICATION_CREATED = "NOTIFICATION_CREATED";
const NOTIFICATION_READ = "NOTIFICATION_READ";
const NOTIFICATION_READ_ALL = "NOTIFICATION_READ_ALL";

const normalizeNotificationType = (
  value: NotificationType | string | undefined,
): NotificationType | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).toUpperCase();

  switch (normalized) {
    case "SYSTEM":
    case "GENERAL":
    case "SHIFT":
      return NotificationType.SYSTEM_MESSAGE;
    case "QUALITY":
      return NotificationType.QUALITY_ISSUE;
    case "INVENTORY":
      return NotificationType.INVENTORY_LOW;
    default:
      return Object.values(NotificationType).includes(
        normalized as NotificationType,
      )
        ? (normalized as NotificationType)
        : undefined;
  }
};

export const getMyNotifications = async (
  userId: number,
  query: ListNotificationsQuery = {},
): Promise<ServiceResult<unknown>> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    ...(query.type ? { type: query.type } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    status: 200,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
};

export const getUnreadNotificationCount = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { status: 200, data: { unreadCount: count } };
};

export const markNotificationAsRead = async (
  userId: number,
  notificationId: number,
): Promise<ServiceResult<unknown>> => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    return { status: 404, message: "Notification not found" };
  }

  if (notification.isRead) {
    return { status: 200, data: notification };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  auditAsync(
    userId,
    NOTIFICATION_READ,
    AuditEntityType.NOTIFICATION,
    notificationId,
  );

  emitNotificationUnreadCountUpdate(userId, {
    refresh: true,
    notificationId,
  });

  return { status: 200, data: updated };
};

export const markAllNotificationsAsRead = async (
  userId: number,
): Promise<ServiceResult<unknown>> => {
  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: now,
    },
  });

  auditAsync(
    userId,
    NOTIFICATION_READ_ALL,
    AuditEntityType.NOTIFICATION,
    undefined,
    {
      updatedCount: result.count,
    },
  );

  emitNotificationUnreadCountUpdate(userId, {
    refresh: true,
    updatedCount: result.count,
  });

  return { status: 200, data: { updatedCount: result.count } };
};

export const createNotification = async (
  createdById: number,
  payload: CreateNotificationPayload,
): Promise<ServiceResult<unknown>> => {
  const title = payload.title?.trim();
  const message = payload.message?.trim();
  const notificationType = normalizeNotificationType(payload.type);

  if (!title || !message) {
    return { status: 400, message: "title and message are required" };
  }

  if (!notificationType) {
    return { status: 400, message: "Valid notification type is required" };
  }

  const targetType = payload.targetType ?? "USER";

  let targetUserIds: number[] = [];

  if (targetType === "ALL") {
    const allActiveUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    targetUserIds = allActiveUsers.map((user) => user.id);
  } else if (targetType === "ROLE") {
    if (!payload.role) {
      return { status: 400, message: "role is required for ROLE target" };
    }
    const roleUsers = await prisma.user.findMany({
      where: { role: payload.role as any, isActive: true, deletedAt: null },
      select: { id: true },
    });
    targetUserIds = roleUsers.map((u) => u.id);
  } else if (targetType === "SHIFT") {
    const shiftId = Number(payload.shiftId);
    if (!Number.isInteger(shiftId) || shiftId <= 0) {
      return { status: 400, message: "shiftId is required for SHIFT target" };
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true },
    });
    if (!shift) {
      return { status: 404, message: "Shift not found" };
    }

    const shiftUsers = await prisma.user.findMany({
      where: {
        shiftId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    targetUserIds = shiftUsers.map((user) => user.id);
  } else {
    const idsFromArray = Array.isArray(payload.userIds)
      ? payload.userIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const idsFromSingle = payload.userId ? [Number(payload.userId)] : [];
    targetUserIds = [...new Set([...idsFromArray, ...idsFromSingle])];
  }

  if (targetUserIds.length === 0) {
    return {
      status: 400,
      message:
        targetType === "USER"
          ? "At least one target user is required (userId or userIds)"
          : "No target users found for the selected target",
    };
  }

  if (targetType === "USER") {
    const users = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true },
    });

    if (users.length !== targetUserIds.length) {
      return {
        status: 404,
        message: "One or more target users were not found",
      };
    }
  }

  const created = await prisma.$transaction(
    targetUserIds.map((targetUserId) =>
      prisma.notification.create({
        data: {
          userId: targetUserId,
          title,
          message,
          type: notificationType,
          chatGroupId: payload.chatGroupId ?? null,
          machineId: payload.machineId ?? null,
          productionId: payload.productionId ?? null,
        },
      }),
    ),
  );

  auditAsync(
    createdById,
    NOTIFICATION_CREATED,
    AuditEntityType.NOTIFICATION,
    undefined,
    {
      type: notificationType,
      targetCount: created.length,
      targetType,
      shiftId: payload.shiftId ?? null,
      targetUserIds,
    },
  );

  created.forEach((notification) => {
    emitNotificationToUser(notification.userId, notification);
    emitNotificationUnreadCountUpdate(notification.userId, { refresh: true });
  });

  sendPushToUsers(targetUserIds, title, message, { type: notificationType }).catch(() => undefined);

  return { status: 201, data: created };
};

export const dispatchAutoNotification = async (
  payload: AutoNotificationEvent,
): Promise<void> => {
  const actor = await prisma.user.findUnique({
    where: { id: payload.actorUserId },
    select: {
      id: true,
      fullName: true,
      username: true,
      shiftId: true,
    },
  });

  if (!actor) {
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

  const recipientIds = new Set<number>(admins.map((admin) => admin.id));
  const rule = await getNotificationRuleForEvent(payload.event);

  if (!rule.enabled) {
    return;
  }

  let title = "";
  let message = "";
  let type: NotificationType = NotificationType.SYSTEM_MESSAGE;
  let productionId: number | undefined;

  if (payload.event === "PRODUCTION_CREATED") {
    type = NotificationType.PRODUCTION_ALERT;
    title = "New production record";
    message = `${actor.fullName || actor.username} added a production record${payload.totalPieces ? ` (${payload.totalPieces} pieces)` : ""}.`;
    productionId = payload.productionId;
  }

  if (payload.event === "PURCHASE_CREATED") {
    title = "New purchase created";
    message = `${actor.fullName || actor.username} created purchase #${payload.purchaseId ?? "-"}${payload.totalAmount ? ` with total ${payload.totalAmount}` : ""}.`;
  }

  if (payload.event === "SALE_CREATED") {
    title = "New sale created";
    message = `${actor.fullName || actor.username} created sale #${payload.saleId ?? "-"}${payload.totalAmount ? ` with total ${payload.totalAmount}` : ""}.`;
  }

  if (payload.event === "INVENTORY_TRANSACTION_CREATED") {
    title = "New inventory transaction";
    message = `${actor.fullName || actor.username} added inventory ${payload.operationType ?? "transaction"}${payload.materialName ? ` for ${payload.materialName}` : ""}${payload.quantity ? ` (${payload.quantity})` : ""}.`;
  }

  if (rule.delivery === "ADMIN_AND_SHIFT") {
    const shiftId =
      payload.event === "PRODUCTION_CREATED"
        ? (payload.shiftId ?? actor.shiftId)
        : actor.shiftId;

    if (shiftId) {
      const shiftUsers = await prisma.user.findMany({
        where: {
          shiftId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      shiftUsers.forEach((user) => recipientIds.add(user.id));
    }
  }

  recipientIds.delete(payload.actorUserId);

  if (!title || !message || recipientIds.size === 0) {
    return;
  }

  await createNotification(payload.actorUserId, {
    title,
    message,
    type,
    userIds: Array.from(recipientIds),
    ...(productionId ? { productionId } : {}),
  });
};
