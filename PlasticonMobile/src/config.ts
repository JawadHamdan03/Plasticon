// ─── API Configuration ──────────────────────────────────────────────────────
// Browser (Expo Web) → localhost (loopback, always works)
// Physical Device    → reads EXPO_PUBLIC_API_URL / EXPO_PUBLIC_RAG_URL from .env

// `document` exists in every browser; undefined in React Native runtime
const isBrowser = typeof document !== 'undefined';

export const API_BASE = isBrowser
  ? 'http://localhost:8080'
  : (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.8:8080');

export const RAG_BASE = isBrowser
  ? 'http://localhost:3001/api'
  : `${process.env.EXPO_PUBLIC_RAG_URL ?? 'http://192.168.1.8:3001'}/api`;
