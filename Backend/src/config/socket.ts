import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma";

type JwtPayload = {
    id: string;
};

let ioInstance: Server | null = null;

export const initializeSocketServer = (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
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
                select: { id: true },
            });

            if (!user) {
                return next(new Error("User not found"));
            }

            socket.data.userId = user.id;
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
