// ─── API Configuration ──────────────────────────────────────────────────────
//
// Platform routing:
//   Browser (Expo Web) → localhost  (loopback, always works)
//   Physical Device    → 192.168.1.11  (LAN IP — update if it changes)
//
// Uses typeof document check instead of Platform.OS so Metro bundler
// platform shims cannot interfere with the URL at module-eval time.

const DEVICE_HOST = '172.20.10.2';

// `document` exists in every browser; undefined in React Native runtime
const isBrowser = typeof document !== 'undefined';

export const API_BASE = isBrowser ? 'http://localhost:8080' : `http://${DEVICE_HOST}:8080`;
export const RAG_BASE = isBrowser ? 'http://localhost:3001/api' : `http://${DEVICE_HOST}:3001/api`;
