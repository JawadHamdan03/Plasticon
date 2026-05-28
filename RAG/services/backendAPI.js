import { cacheGet, cacheSet } from "./cache.js";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";
const INTERNAL_KEY = process.env.RAG_INTERNAL_KEY ?? "";

const headers = () => ({
  "Content-Type": "application/json",
  "x-rag-key": INTERNAL_KEY,
});

async function fetchJSON(path, cacheKey = null) {
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  const res = await fetch(`${BACKEND}${path}`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Backend ${path} → ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (cacheKey) cacheSet(cacheKey, data);
  return data;
}

// Fetch full context for a user (shift, attendance, maintenance, notifications)
export async function getUserContext(userId) {
  return fetchJSON(`/rag-context/user/${userId}`);
}

// Fetch production context for a date and optional shift name
export async function getProductionContext(date, shift) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (shift) params.set("shift", shift);
  const cacheKey = `prod:${date ?? "today"}:${shift ?? "all"}`;
  return fetchJSON(`/rag-context/production?${params.toString()}`, cacheKey);
}
