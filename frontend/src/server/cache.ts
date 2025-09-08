/**
 * Simple in-memory TTL cache for server-side usage.
 * Note: Resets on process restart. Keep TTLs modest to avoid stale data.
 */
type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

export function getCache<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    store.delete(key);
    return null;
  }
  return e.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + Math.max(0, ttlMs) });
}

export function delCache(key: string): void {
  store.delete(key);
}

export function clearCache(): void {
  store.clear();
}
