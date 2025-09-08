import { NextRequest, NextResponse } from "next/server";

// Simple in-module token cache
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

async function getRedditAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'smb-frontend/0.1';
  if (!clientId || !clientSecret) {
    throw new Error('Reddit OAuth credentials not configured (REDDIT_CLIENT_ID / REDDIT_SECRET)');
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5000) { // reuse if not about to expire
    return cachedToken;
  }

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    throw new Error(`Failed to obtain Reddit access token (${res.status})`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  const expiresIn: number = data.expires_in || 3600; // seconds
  tokenExpiresAt = now + expiresIn * 1000;
  return cachedToken!;
}

// Fetch Reddit comment thread via OAuth with retry/backoff and rate-limit awareness
async function fetchRedditCommentBodyOAuth(permalink: string) {
  const userAgent = process.env.REDDIT_USER_AGENT || 'smb-frontend/0.1';
  const token = await getRedditAccessToken();
  const normalized = permalink.startsWith('/r/') ? permalink : permalink.replace(/^https?:\/\/www\.reddit\.com/, '');
  const url = `https://oauth.reddit.com${normalized}.json`;

  const maxRetries = 4;
  const baseDelay = 500; // ms
  const timeoutMs = 10000;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const jitter = (ms: number) => Math.floor(ms * (0.85 + Math.random() * 0.3));
  const computeBackoff = (attempt: number) => Math.min(8000, baseDelay * Math.pow(2, attempt));
  const headerNum = (h: Headers, k: string): number | null => {
    const v = h.get(k);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': userAgent,
          'Accept': 'application/json'
        },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        try { const data = await res.json(); return { data, status: 200 }; }
        catch { return { error: 'Invalid JSON from Reddit', status: 502 }; }
      }

      const remaining = headerNum(res.headers, 'x-ratelimit-remaining');
      const resetSec = headerNum(res.headers, 'x-ratelimit-reset');
      const isRateLimited = res.status === 429 || (remaining !== null && remaining <= 1);
      if (isRateLimited && attempt < maxRetries) {
        const wait = resetSec && resetSec > 0 ? jitter(resetSec * 1000) : jitter(computeBackoff(attempt));
        await sleep(wait);
        continue;
      }
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(jitter(computeBackoff(attempt)));
        continue;
      }
      const msg = res.status === 403 || res.status === 429
        ? 'Reddit access temporarily blocked or rate limited'
        : `Failed to fetch comments (${res.status})`;
      return { error: msg, status: res.status };
    } catch (e) {
      clearTimeout(t);
      if (attempt < maxRetries) {
        await sleep(jitter(computeBackoff(attempt)));
        continue;
      }
      return { error: 'Network error fetching comments', status: 504 };
    }
  }
  return { error: 'Exhausted retries fetching comments', status: 504 };
}

export async function GET(req: NextRequest) {
  const permalink = req.nextUrl.searchParams.get('permalink');
  if (!permalink) {
    return NextResponse.json({ error: 'Missing permalink parameter' }, { status: 400 });
  }
  try {
    const result = await fetchRedditCommentBodyOAuth(permalink);
    if ('error' in result) {
      return NextResponse.json({ body: null, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ body: result.data }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ body: null, error: message }, { status: 500 });
  }
}
