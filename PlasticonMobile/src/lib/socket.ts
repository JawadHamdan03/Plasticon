import { io, type Socket } from 'socket.io-client';
import { API_BASE } from '../config';
import { getToken } from '../auth/storage';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(): Socket {
  const token = getToken();
  if (socket?.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }

  socket = io(API_BASE, {
    auth: { token: token ? `Bearer ${token}` : '' },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    timeout: 10_000,
  });

  return socket;
}

export function destroySocket(): void {
  socket?.disconnect();
  socket = null;
}
