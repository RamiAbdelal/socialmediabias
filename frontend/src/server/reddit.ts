import type { Reddit } from "@/lib/types";

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

const USER_AGENT = process.env.REDDIT_USER_AGENT || "smb-mvp/0.1";

/** Obtain a short-lived app OAuth token for Reddit API (cached briefly). */
export async function getRedditAccessToken(): Promise<string> {
  const { REDDIT_CLIENT_ID, REDDIT_SECRET } = process.env as Record<string, string | undefined>;
  if (!REDDIT_CLIENT_ID || !REDDIT_SECRET) throw new Error("Missing REDDIT_CLIENT_ID/REDDIT_SECRET");

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 5000) return cachedToken;

  const creds = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_SECRET}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Failed to get Reddit access token");
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export type RedditPostNode = {
  data?: { title?: string; url?: string; permalink?: string; author?: string; score?: number; num_comments?: number };
};

/** Fetch top posts for a subreddit path (e.g., r/worldnews) using OAuth token. */
export async function fetchSubredditTopPosts(subredditPath: string, token: string, limit = 25, time = "month") {
  const apiUrl = `https://oauth.reddit.com/${subredditPath}/top.json?limit=${limit}&t=${time}`;
  const apiRes = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
  });
  if (!apiRes.ok) throw new Error("Failed to fetch subreddit");
  const apiJson = await apiRes.json();
  const posts: RedditPostNode[] = apiJson?.data?.children || [];
  return { posts };
}

// Internal helpers for backoff
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => Math.floor(ms * (0.85 + Math.random() * 0.3));
const headerNum = (h: Headers, key: string): number | null => {
  const v = h.get(key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Fetch a comment thread JSON for a given permalink with retries, backoff, and timeout. */
export async function fetchCommentsWithBackoff(permalink: string, token: string, timeoutMs = 10000): Promise<Reddit.APIResponse | null> {
  const url = `https://oauth.reddit.com${permalink}.json?limit=50&depth=1`;
  const maxRetries = 4;
  const baseDelay = 500; // ms
  const computeBackoff = (attempt: number) => Math.min(8000, baseDelay * Math.pow(2, attempt));

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT }, signal: controller.signal });
      clearTimeout(t);
      if (r.ok) {
        try { return (await r.json()) as Reddit.APIResponse; } catch { return null; }
      }
      const remaining = headerNum(r.headers, "x-ratelimit-remaining");
      const resetSec = headerNum(r.headers, "x-ratelimit-reset");
      const isRateLimited = r.status === 429 || (remaining !== null && remaining <= 1);
      if (isRateLimited && attempt < maxRetries) {
        const wait = resetSec && resetSec > 0 ? jitter(resetSec * 1000) : jitter(computeBackoff(attempt));
        console.warn("[SSE] reddit comments ratelimited, backing off ms=", wait, "attempt", attempt + 1, "/", maxRetries + 1);
        await sleep(wait);
        continue;
      }
      if (r.status >= 500 && attempt < maxRetries) {
        await sleep(jitter(computeBackoff(attempt)));
        continue;
      }
      return null;
    } catch {
      clearTimeout(t);
      if (attempt < maxRetries) {
        await sleep(jitter(computeBackoff(attempt)));
        continue;
      }
      return null;
    }
  }
  return null;
}

/** Extract up to 20 top-level comment bodies from a Reddit thread JSON listing. */
export function extractTopLevelCommentBodies(threadJson: Reddit.APIResponse): string[] {
  if (!Array.isArray(threadJson) || threadJson.length < 2) return [];
  const commentsListing = threadJson[1] as Reddit.CommentListing;
  const children: Reddit.Comment[] = commentsListing.data.children as unknown as Reddit.Comment[];
  return children
    .filter((c) => c && c.kind === "t1")
    .map((c) => c.data?.body)
    .filter((b): b is string => typeof b === "string" && b.length > 0)
    .slice(0, 20);
}
