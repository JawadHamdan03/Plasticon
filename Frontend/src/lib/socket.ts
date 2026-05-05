import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

export const createUserSocket = (): Socket | null => {
  if (!window.navigator.onLine) {
    return null;
  }

  const socket = io(API_BASE_URL, {
    transports: ["websocket"],
    timeout: 5000,
    reconnection: true,
    reconnectionAttempts: 2,
    reconnectionDelay: 1200,
    withCredentials: true,
  });

  return socket;
};
