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

// Fetch Reddit comment thread via OAuth (safer / fewer blocks)
async function fetchRedditCommentBodyOAuth(permalink: string) {
  const userAgent = process.env.REDDIT_USER_AGENT || 'smb-frontend/0.1';
  const token = await getRedditAccessToken();
  // Ensure permalink starts with '/r/' and no protocol
  const normalized = permalink.startsWith('/r/') ? permalink : permalink.replace(/^https?:\/\/www\.reddit\.com/, '');
  const url = `https://oauth.reddit.com${normalized}.json`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': userAgent,
      'Accept': 'application/json'
    }
  });
  if (res.status === 403 || res.status === 429) {
    return { error: 'Reddit access temporarily blocked or rate limited', status: res.status };
  }
  if (!res.ok) {
    return { error: `Failed to fetch comments (${res.status})`, status: res.status };
  }
  const data = await res.json();
  return { data, status: 200 };
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
