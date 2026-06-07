import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

export const createUserSocket = (): Socket | null => {
  if (!window.navigator.onLine) {
    return null;
  }

  const token = window.localStorage.getItem("plasticon_token") ?? "";

  const socket = io(API_BASE_URL, {
    transports: ["websocket", "polling"],
    timeout: 8000,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    withCredentials: true,
    auth: { token },
  });

  return socket;
};
