const TTL_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value) {
  store.set(key, { value, ts: Date.now() });
}

export function cacheDelete(key) {
  store.delete(key);
}
