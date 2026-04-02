import "dotenv/config";
import { io } from "socket.io-client";

const serverUrl = process.env.SOCKET_URL || "http://localhost:8080";
const providedToken = process.env.CHAT_TOKEN;
const loginEmail = process.env.CHAT_EMAIL;
const loginPassword = process.env.CHAT_PASSWORD;
const groupId = Number(process.env.CHAT_GROUP_ID || "0");
const timeoutMs = Number(process.env.CHAT_TEST_TIMEOUT_MS || "15000");

if (!Number.isInteger(groupId) || groupId <= 0) {
    console.error("Missing or invalid CHAT_GROUP_ID environment variable");
    process.exit(1);
}

const getToken = async () => {
    if (providedToken) {
        return providedToken;
    }

    if (!loginEmail || !loginPassword) {
        console.error(
            "Missing auth credentials: provide CHAT_TOKEN, or provide CHAT_EMAIL and CHAT_PASSWORD"
        );
        process.exit(1);
    }

    const response = await fetch(`${serverUrl}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error("Failed to login for socket test", {
            status: response.status,
            body: text,
        });
        process.exit(1);
    }

    const body = await response.json();
    const tokenFromLogin = body?.token;

    if (!tokenFromLogin || typeof tokenFromLogin !== "string") {
        console.error("Login response did not include token");
        process.exit(1);
    }

    return tokenFromLogin;
};

const token = await getToken();

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
