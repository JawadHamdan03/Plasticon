import { Response } from "express";
import { NotificationType } from "../config/generated/prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../config/lib/prisma";
import {
    createNotification,
    getMyNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../services/notificationServices";

export const getMyNotificationsHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Not authorized" });
        return;
    }

    const isReadParam = req.query.isRead;
    const isRead =
        isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;

    const typeParam = typeof req.query.type === "string" ? req.query.type : undefined;
    const type =
        typeParam && Object.values(NotificationType).includes(typeParam as NotificationType)
            ? (typeParam as NotificationType)
            : undefined;

    const result = await getMyNotifications(userId, {
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        isRead,
        type,
    });

    res.status(result.status).json(result.data);
};

export const getUnreadNotificationCountHandler = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Not authorized" });
        return;
    }

    const result = await getUnreadNotificationCount(userId);
    res.status(result.status).json(result.data);
};

export const markNotificationAsReadHandler = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Not authorized" });
        return;
    }

    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        res.status(400).json({ message: "id must be a positive integer" });
        return;
    }

    const result = await markNotificationAsRead(userId, notificationId);
    if (result.message) {
        res.status(result.status).json({ message: result.message });
        return;
    }

    res.status(result.status).json(result.data);
};

export const markAllNotificationsAsReadHandler = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: "Not authorized" });
        return;
    }

    const result = await markAllNotificationsAsRead(userId);
    res.status(result.status).json(result.data);
};

export const createNotificationHandler = async (req: AuthenticatedRequest, res: Response) => {
    const createdById = req.user?.id;
    if (!createdById) {
        res.status(401).json({ message: "Not authorized" });
        return;
    }

    const result = await createNotification(createdById, req.body);
    if (result.message) {
        res.status(result.status).json({ message: result.message });
        return;
    }

    res.status(result.status).json(result.data);
};

export const registerPushTokenHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Not authorized" }); return; }

    const { token, platform } = req.body as { token?: string; platform?: string };
    if (!token || typeof token !== "string" || token.trim().length === 0) {
        res.status(400).json({ message: "token is required" });
        return;
    }

    const platformStr = typeof platform === "string" && platform ? platform : "unknown";

    await prisma.pushToken.upsert({
        where: { token: token.trim() },
        create: { userId, token: token.trim(), platform: platformStr },
        update: { userId, platform: platformStr },
    });

    res.status(200).json({ message: "Push token registered" });
};

export const unregisterPushTokenHandler = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ message: "Not authorized" }); return; }

    const { token } = req.body as { token?: string };
    if (token && typeof token === "string" && token.trim().length > 0) {
        await prisma.pushToken.deleteMany({ where: { userId, token: token.trim() } });
    } else {
        await prisma.pushToken.deleteMany({ where: { userId } });
    }

    res.status(200).json({ message: "Push token unregistered" });
};
