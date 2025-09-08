import { NextResponse } from 'next/server';
import { getMBFCBiasForUrls, MBFCResult } from '@/server/mbfc-signal';

export const runtime = 'nodejs';

async function getRedditAccessToken() {
  const { REDDIT_CLIENT_ID, REDDIT_SECRET, REDDIT_USER_AGENT } = process.env as Record<string, string | undefined>;
  if (!REDDIT_CLIENT_ID || !REDDIT_SECRET) throw new Error('Missing REDDIT_CLIENT_ID/REDDIT_SECRET');
  const creds = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT || 'smb-mvp/0.1'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('Failed to get Reddit access token');
  const data = await res.json();
  return data.access_token as string;
}

function labelForScore(s: number) {
  if (s <= 1.5) return 'far-left';
  if (s <= 3.5) return 'left';
  if (s < 6.5) return 'center';
  if (s < 8.5) return 'right';
  return 'far-right';
}

export async function POST(request: Request) {
  try {
    const { redditUrl } = await request.json();
    if (!redditUrl || !/^https:\/\/(?:www\.)?reddit\.com\//.test(redditUrl)) {
      return NextResponse.json({ error: 'Valid redditUrl required' }, { status: 400 });
    }
    const subredditMatch = redditUrl.match(/reddit\.com\/(r\/[^/]+)/i);
    if (!subredditMatch) return NextResponse.json({ error: 'Could not extract subreddit' }, { status: 400 });
    const subreddit = subredditMatch[1];

    // Fetch subreddit top posts
    const token = await getRedditAccessToken();
    const apiUrl = `https://oauth.reddit.com/${subreddit}/top.json?limit=25&t=month`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'smb-mvp/0.1'
      }
    });
    if (!apiRes.ok) throw new Error('Failed to fetch subreddit');
  interface RedditPostNode { data?: { title?: string; url?: string; permalink?: string; author?: string; score?: number } }
  const apiJson = await apiRes.json();
  const posts: RedditPostNode[] = apiJson?.data?.children || [];

    // Extract external URLs
  const urls: string[] = posts.map((p: RedditPostNode) => p?.data?.url as string).filter((u: string) => u && /^https?:\/\//.test(u));

    // MBFC lookup (direct DB)
  let biasResults: MBFCResult[] = [];
  const biasCount: Record<string, number> = {};
    try {
      biasResults = await getMBFCBiasForUrls(urls);
  for (const r of biasResults) if (r.bias) biasCount[r.bias] = (biasCount[r.bias] || 0) + 1;
  } catch {
      // proceed without MBFC
    }

    // Naive overall score: centered baseline, higher confidence if MBFC found
    const mbfcFound = Object.keys(biasCount).length > 0;
    const subredditLeanScore = 5; // placeholder center
    const confidence = mbfcFound ? 0.5 : 0.3;

    const response = {
      subreddit,
      totalPosts: posts.length,
      urlsChecked: urls.length,
      biasBreakdown: biasCount,
      details: biasResults,
      overallScore: { score: subredditLeanScore, label: labelForScore(subredditLeanScore), confidence },
      redditPosts: posts.map((p: RedditPostNode) => ({
        title: p?.data?.title,
        url: p?.data?.url,
        permalink: p?.data?.permalink,
        author: p?.data?.author,
        score: p?.data?.score,
      })),
      communityName: subreddit,
      platform: 'reddit',
      analysisDate: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
