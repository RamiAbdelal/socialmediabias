import Redis from 'ioredis';

let client: InstanceType<typeof Redis> | null = null;

export function getRedis(): InstanceType<typeof Redis> | null {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = new Redis(url, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
  });
  client.on('error', (e: unknown) => {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);
    console.warn('[redis] error', msg);
  });
  client.on('connect', () => {
    console.log('[redis] connected');
  });
  return client;
}

export function hasRedis(): boolean {
  return !!process.env.REDIS_URL;
}
