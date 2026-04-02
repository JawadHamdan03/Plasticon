import { NotificationType } from "../config/generated/prisma/client";
import { prisma } from "../config/lib/prisma";
import { emitNotificationToUser, emitNotificationUnreadCountUpdate } from "../config/socket";
import { auditAsync } from "./auditHelper";
import { AuditEntityType } from "./auditServices";

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
    userId?: number;
    userIds?: number[];
    chatGroupId?: number;
    machineId?: number;
    productionId?: number;
};

const NOTIFICATION_CREATED = "NOTIFICATION_CREATED";
const NOTIFICATION_READ = "NOTIFICATION_READ";
const NOTIFICATION_READ_ALL = "NOTIFICATION_READ_ALL";

export const getMyNotifications = async (
    userId: number,
    query: ListNotificationsQuery = {}
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

export const getUnreadNotificationCount = async (userId: number): Promise<ServiceResult<unknown>> => {
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
    notificationId: number
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

    auditAsync(userId, NOTIFICATION_READ, AuditEntityType.NOTIFICATION, notificationId);

    emitNotificationUnreadCountUpdate(userId, {
        refresh: true,
        notificationId,
    });

    return { status: 200, data: updated };
};

export const markAllNotificationsAsRead = async (userId: number): Promise<ServiceResult<unknown>> => {
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

    auditAsync(userId, NOTIFICATION_READ_ALL, AuditEntityType.NOTIFICATION, undefined, {
        updatedCount: result.count,
    });

    emitNotificationUnreadCountUpdate(userId, {
        refresh: true,
        updatedCount: result.count,
    });

    return { status: 200, data: { updatedCount: result.count } };
};

export const createNotification = async (
    createdById: number,
    payload: CreateNotificationPayload
): Promise<ServiceResult<unknown>> => {
    const title = payload.title?.trim();
    const message = payload.message?.trim();

    if (!title || !message) {
        return { status: 400, message: "title and message are required" };
    }

    if (!payload.type || !Object.values(NotificationType).includes(payload.type)) {
        return { status: 400, message: "Valid notification type is required" };
    }

    const idsFromArray = Array.isArray(payload.userIds)
        ? payload.userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
        : [];
    const idsFromSingle = payload.userId ? [Number(payload.userId)] : [];
    const targetUserIds = [...new Set([...idsFromArray, ...idsFromSingle])];

    if (targetUserIds.length === 0) {
        return { status: 400, message: "At least one target user is required (userId or userIds)" };
    }

    const users = await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: { id: true },
    });

    if (users.length !== targetUserIds.length) {
        return { status: 404, message: "One or more target users were not found" };
    }

    const created = await prisma.$transaction(
        targetUserIds.map((targetUserId) =>
            prisma.notification.create({
                data: {
                    userId: targetUserId,
                    title,
                    message,
                    type: payload.type as NotificationType,
                    chatGroupId: payload.chatGroupId ?? null,
                    machineId: payload.machineId ?? null,
                    productionId: payload.productionId ?? null,
                },
            })
        )
    );

    auditAsync(createdById, NOTIFICATION_CREATED, AuditEntityType.NOTIFICATION, undefined, {
        type: payload.type,
        targetCount: created.length,
        targetUserIds,
    });

    created.forEach((notification) => {
        emitNotificationToUser(notification.userId, notification);
        emitNotificationUnreadCountUpdate(notification.userId, { refresh: true });
    });

    return { status: 201, data: created };
};
