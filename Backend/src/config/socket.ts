import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma";

type JwtPayload = {
    id: string;
};

let ioInstance: Server | null = null;

export const initializeSocketServer = (httpServer: HttpServer, allowedOrigins: string[]) => {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
        },
    });

    io.use(async (socket, next) => {
        try {
            const authHeader = socket.handshake.headers.authorization;
            const authToken =
                typeof socket.handshake.auth?.token === "string"
                    ? socket.handshake.auth.token
                    : undefined;

            let token = "";

            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1] ?? "";
            } else if (authToken?.startsWith("Bearer ")) {
                token = authToken.split(" ")[1] ?? "";
            } else if (authToken) {
                token = authToken;
            }

            if (!token) {
                return next(new Error("Not authorized"));
            }

            const secret = process.env.JWT_SECRET as string;
            const decoded = jwt.verify(token, secret) as JwtPayload;
            const userId = Number(decoded.id);

            if (!Number.isInteger(userId) || userId <= 0) {
                return next(new Error("Invalid token payload"));
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, fullName: true },
            });

            if (!user) {
                return next(new Error("User not found"));
            }

            socket.data.userId = user.id;
            socket.data.fullName = user.fullName;
            return next();
        } catch (_error) {
            return next(new Error("Not authorized"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.data.userId as number;
        socket.join(`user:${userId}`);

        socket.on("join:group", async (groupIdInput: unknown) => {
            const groupId = Number(groupIdInput);
            if (!Number.isInteger(groupId) || groupId <= 0) {
                socket.emit("error:chat", { message: "Invalid groupId" });
                return;
            }

            const membership = await prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId, userId } },
                select: { id: true },
            });

            if (!membership) {
                socket.emit("error:chat", { message: "Access denied" });
                return;
            }

            socket.join(`group:${groupId}`);
            socket.emit("joined:group", { groupId });
        });

        socket.on("leave:group", (groupIdInput: unknown) => {
            const groupId = Number(groupIdInput);
            if (!Number.isInteger(groupId) || groupId <= 0) {
                return;
            }

            socket.leave(`group:${groupId}`);
            socket.emit("left:group", { groupId });
        });

        // ── Call signaling (relay model) ──────────────────────────────────────
        socket.on("call:initiate", (data: { toUserId: number; type: "video" | "voice"; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:incoming", {
                callId: data.callId, type: data.type,
                callerName: socket.data.fullName as string, callerId: userId,
            });
        });

        socket.on("call:accept", (data: { toUserId: number; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:accepted", { callId: data.callId });
        });

        socket.on("call:reject", (data: { toUserId: number; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:rejected", { callId: data.callId });
        });

        socket.on("call:busy", (data: { toUserId: number; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:busy", { callId: data.callId });
        });

        socket.on("call:offer", (data: { toUserId: number; sdp: unknown; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:offer", { sdp: data.sdp, callerId: userId, callId: data.callId });
        });

        socket.on("call:answer", (data: { toUserId: number; sdp: unknown; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:answer", { sdp: data.sdp, callId: data.callId });
        });

        socket.on("call:ice", (data: { toUserId: number; candidate: unknown; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:ice", { candidate: data.candidate, callId: data.callId });
        });

        socket.on("call:end", (data: { toUserId: number; callId: string }) => {
            if (!data?.toUserId || !data?.callId) return;
            io.to(`user:${data.toUserId}`).emit("call:ended", { callId: data.callId });
        });
    });

    ioInstance = io;
    return io;
};

export const getSocketServer = () => ioInstance;

export const emitChatMessageToGroup = (groupId: number, payload: unknown) => {
    if (!ioInstance) {
        return;
    }

    ioInstance.to(`group:${groupId}`).emit("chat:message", payload);
};

export const emitUnreadCountUpdate = (userId: number, payload: unknown) => {
    if (!ioInstance) {
        return;
    }

    ioInstance.to(`user:${userId}`).emit("chat:unread-count-updated", payload);
};

export const emitNotificationToUser = (userId: number, payload: unknown) => {
    if (!ioInstance) {
        return;
    }

    ioInstance.to(`user:${userId}`).emit("notification:new", payload);
};

export const emitNotificationUnreadCountUpdate = (userId: number, payload: unknown) => {
    if (!ioInstance) {
        return;
    }

    ioInstance.to(`user:${userId}`).emit("notification:unread-count-updated", payload);
};

export const emitSnapshotCreated = (payload: unknown) => {
    if (!ioInstance) {
        return;
    }

    ioInstance.emit("snapshot:created", payload);
};
