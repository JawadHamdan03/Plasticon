// ─── API Configuration ──────────────────────────────────────────────────────
//
// DEVICE TESTING NOTES:
//   iOS Simulator   → 'http://localhost:8080'  (works as-is)
//   Android Emulator → 'http://10.0.2.2:8080'  (maps to host localhost)
//   Physical Device  → 'http://192.168.x.x:8080' (use your machine's local IP)
//
// For Expo Go on a physical device, set these to your machine's local IP.
// Your current local IP: 192.168.1.11
// Run `ipconfig` (Windows) or `ifconfig` (Mac) to find it if it changes.
export const API_BASE = 'http://192.168.1.11:8080';
export const RAG_BASE = 'http://192.168.1.11:3001/api';
