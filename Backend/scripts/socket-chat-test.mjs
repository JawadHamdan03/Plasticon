import { io } from "socket.io-client";

const serverUrl = process.env.SOCKET_URL || "http://localhost:8080";
const token = process.env.CHAT_TOKEN;
const groupId = Number(process.env.CHAT_GROUP_ID || "0");
const timeoutMs = Number(process.env.CHAT_TEST_TIMEOUT_MS || "15000");

if (!token) {
    console.error("Missing CHAT_TOKEN environment variable");
    process.exit(1);
}

if (!Number.isInteger(groupId) || groupId <= 0) {
    console.error("Missing or invalid CHAT_GROUP_ID environment variable");
    process.exit(1);
}

const socket = io(serverUrl, {
    auth: { token },
    transports: ["websocket"],
});

const shutdown = (code) => {
    try {
        socket.disconnect();
    } catch (_error) {
        // Ignore disconnect errors during shutdown.
    }
    process.exit(code);
};

const timer = setTimeout(() => {
    console.error(`Timed out after ${timeoutMs}ms`);
    shutdown(1);
}, timeoutMs);

socket.on("connect", () => {
    console.log("Connected", { socketId: socket.id });
    socket.emit("join:group", groupId);
});

socket.on("joined:group", (payload) => {
    console.log("Joined group", payload);
    console.log("Now send a REST message to POST /chat/groups/:groupId/messages and watch for chat:message");
});

socket.on("chat:message", (payload) => {
    console.log("chat:message", payload);
});

socket.on("chat:unread-count-updated", (payload) => {
    console.log("chat:unread-count-updated", payload);
});

socket.on("error:chat", (payload) => {
    console.error("error:chat", payload);
});

socket.on("connect_error", (error) => {
    console.error("connect_error", error.message);
    clearTimeout(timer);
    shutdown(1);
});

process.on("SIGINT", () => {
    clearTimeout(timer);
    shutdown(0);
});

process.on("SIGTERM", () => {
    clearTimeout(timer);
    shutdown(0);
});
