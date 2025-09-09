import { NextResponse } from 'next/server';
import { getMBFCBiasForUrls, MBFCResult } from '@/server/mbfc-signal';
import { getRedditAccessToken, fetchSubredditTopPosts } from '@/server/reddit';
import { labelForScore } from '@/server/scoring';

export const runtime = 'nodejs';

// ----- Config (edit here) -----
const REDDIT_TOP_LIMIT = 25;
const REDDIT_TOP_TIME = 'month' as const;
// --------------------------------

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
  const { posts } = await fetchSubredditTopPosts(subreddit, token, REDDIT_TOP_LIMIT, REDDIT_TOP_TIME);
  interface RedditPostNode { data?: { title?: string; url?: string; permalink?: string; author?: string; score?: number } }

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
