import { getRedis, hasRedis } from '@/server/redis';

const PREFIX = 'smb:';

export async function getCache<T>(key: string): Promise<T | null> {
	if (!hasRedis()) throw new Error('Redis not configured (REDIS_URL missing)');
	const r = getRedis();
	if (!r) return null;
	const val = await r.get(PREFIX + key);
	if (!val) return null;
	try { return JSON.parse(val) as T; } catch { return null; }
}

export async function setCache(key: string, value: unknown, ttlMs: number): Promise<void> {
	if (!hasRedis()) throw new Error('Redis not configured (REDIS_URL missing)');
	const r = getRedis();
	if (!r) return;
	const payload = JSON.stringify(value);
	// PX expects milliseconds
	await r.set(PREFIX + key, payload, 'PX', ttlMs);
}

export async function delCache(key: string): Promise<void> {
	if (!hasRedis()) throw new Error('Redis not configured (REDIS_URL missing)');
	const r = getRedis();
	if (!r) return;
	await r.del(PREFIX + key);
}

export async function clearCache(): Promise<void> {
	if (!hasRedis()) throw new Error('Redis not configured (REDIS_URL missing)');
	const r = getRedis();
	if (!r) return;
	// Avoid FLUSHALL; delete only our keys
	const pattern = PREFIX + '*';
	const stream = r.scanStream({ match: pattern, count: 100 });
	const toDel: string[] = [];
	for await (const keys of stream) {
		for (const k of keys as string[]) toDel.push(k);
		if (toDel.length >= 500) { await r.del(...toDel.splice(0, toDel.length)); }
	}
	if (toDel.length) await r.del(...toDel);
}
