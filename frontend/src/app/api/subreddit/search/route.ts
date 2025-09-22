import { NextRequest } from 'next/server';
import { getRedditAccessToken, searchSubreddits } from '@/server/reddit';

const CACHE = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 60_000; // 1 minute

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(20, Math.max(5, Number(searchParams.get('limit') || 10)));

  if (!q || q.length < 2) {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const key = `${q}|${limit}`;
  const now = Date.now();
  const hit = CACHE.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return new Response(JSON.stringify(hit.data), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } });
  }

  try {
    const token = await getRedditAccessToken();
    const items = await searchSubreddits(q, token, limit);
    const payload = { items };
    CACHE.set(key, { at: now, data: payload });
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'search failed';
    return new Response(JSON.stringify({ items: [], message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
