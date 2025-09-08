import { NextRequest } from 'next/server';
import { getMBFCBiasForUrls, MBFCResult } from '@/server/mbfc-signal';
import { analyzeSentiment, type SentimentResult } from '@/server/ai/adapter';
import type { Reddit } from '@/lib/types';

export const runtime = 'nodejs';

type RedditPostNode = { data?: { title?: string; url?: string; permalink?: string; author?: string; score?: number; num_comments?: number } };

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

// Discussion helpers (ported)
function mapBiasToScore(bias?: string) {
  const biasMap: Record<string, number> = {
    'Extreme-Left': -5,
    'Left': -4,
    'Left-Center': -2,
    'Least Biased': 0,
    'Right-Center': 2,
    'Right': 4,
    'Extreme-Right': 5,
    'Questionable': 4
  };
  return bias ? (biasMap[bias] ?? 0) : 0;
}
function mapSentimentToMultiplier(sentiment: string) {
  switch (sentiment) {
    case 'positive': return 1;
    case 'negative': return -1;
    default: return 0;
  }
}
function normalizeOverall(avg: number) {
  const n = ((avg + 5) / 10) * 10;
  return Math.min(10, Math.max(0, n));
}

async function fetchComments(permalink: string, token: string, timeoutMs = 10000): Promise<Reddit.APIResponse | null> {
  const url = `https://oauth.reddit.com${permalink}.json?limit=50&depth=1`;
  const maxRetries = 4;
  const baseDelay = 500; // ms

  function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }
  function jitter(ms: number) { return Math.floor(ms * (0.85 + Math.random()*0.3)); }
  function computeBackoff(attempt: number) {
    const exp = Math.min(8000, baseDelay * Math.pow(2, attempt));
    return jitter(exp);
  }
  function headerNum(h: Headers, key: string): number | null {
    const v = h.get(key);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': process.env.REDDIT_USER_AGENT || 'smb-mvp/0.1' },
        signal: controller.signal
      });
      clearTimeout(t);

      if (r.ok) {
        try { return await r.json() as Reddit.APIResponse; }
        catch { return null; }
      }

      // Rate limit handling
      const remaining = headerNum(r.headers, 'x-ratelimit-remaining');
      const resetSec = headerNum(r.headers, 'x-ratelimit-reset');
      const isRateLimited = r.status === 429 || (remaining !== null && remaining <= 1);
      if (isRateLimited && attempt < maxRetries) {
        const wait = resetSec && resetSec > 0 ? jitter(resetSec * 1000) : computeBackoff(attempt);
        console.warn('[SSE] reddit comments ratelimited, backing off ms=', wait, 'attempt', attempt+1, '/', maxRetries+1);
        await sleep(wait);
        continue;
      }

      // Retry on 5xx
      if (r.status >= 500 && attempt < maxRetries) {
        const wait = computeBackoff(attempt);
        await sleep(wait);
        continue;
      }

      // Non-retryable
      return null;
    } catch (e) {
      clearTimeout(t);
      if (attempt < maxRetries) {
        const wait = computeBackoff(attempt);
        await sleep(wait);
        continue;
      }
      return null;
    }
  }
  return null;
}
function extractTopLevelCommentBodies(threadJson: Reddit.APIResponse): string[] {
  if (!Array.isArray(threadJson) || threadJson.length < 2) return [];
  const commentsListing = threadJson[1];
  const children = commentsListing?.data?.children || [] as Reddit.Comment[];
  return children
    .filter((c) => c && c.kind === 't1')
    .map((c) => (c as Reddit.Comment).data && (c as Reddit.Comment).data.body)
    .filter((b): b is string => Boolean(b))
    .slice(0, 20);
}
function heuristicSentiment(commentTexts: string[]) {
  if (!commentTexts.length) return 'neutral';
  const joined = commentTexts.join('\n').toLowerCase();
  const negativeWords = ['propaganda','trash','fake','lies','lying','biased','hack','hate','disgusting','bad take','cope'];
  const positiveWords = ['agree','true','accurate','based','good point','well said','makes sense'];
  let neg = 0, pos = 0;
  for (const w of negativeWords) if (joined.includes(w)) neg++;
  for (const w of positiveWords) if (joined.includes(w)) pos++;
  if (neg === 0 && pos === 0) return 'neutral';
  if (neg > pos * 1.2) return 'negative';
  if (pos > neg * 1.2) return 'positive';
  return 'neutral';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const redditUrl = searchParams.get('redditUrl') || '';
    if (!/^https:\/\/(?:www\.)?reddit\.com\//.test(redditUrl)) {
      return new Response('Bad Request', { status: 400 });
    }
    const subredditMatch = redditUrl.match(/reddit\.com\/(r\/[^/]+)/i);
    if (!subredditMatch) return new Response('Bad Request', { status: 400 });
    const subreddit = subredditMatch[1];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        function writeEvent(name: string, data: unknown) {
          const payload = `event: ${name}\n` + `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        try {
          // Phase A: Reddit
          const token = await getRedditAccessToken();
          const apiUrl = `https://oauth.reddit.com/${subreddit}/top.json?limit=25&t=month`;
          const apiRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': process.env.REDDIT_USER_AGENT || 'smb-mvp/0.1' } });
          if (!apiRes.ok) throw new Error('Failed to fetch subreddit');
          const apiJson = await apiRes.json();
          const posts: RedditPostNode[] = apiJson?.data?.children || [];
          writeEvent('reddit', {
            subreddit,
            redditPosts: posts.map(p => ({
              title: p?.data?.title,
              url: p?.data?.url,
              permalink: p?.data?.permalink,
              author: p?.data?.author,
              score: p?.data?.score,
            })),
            totalPosts: posts.length,
          });

          // Phase B: MBFC
          console.log('[SSE] Phase A complete: posts', posts.length);
          const urls: string[] = posts.map(p => p?.data?.url as string).filter((u: string) => u && /^https?:\/\//.test(u));
          let biasResults: MBFCResult[] = [];
          const biasCount: Record<string, number> = {};
          try {
            biasResults = await getMBFCBiasForUrls(urls);
            for (const r of biasResults) if (r.bias) biasCount[r.bias] = (biasCount[r.bias] || 0) + 1;
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[SSE] MBFC lookup failed:', message);
          }
          const mbfcFound = Object.keys(biasCount).length > 0;
          const provisionalScore = 5; // centered placeholder
          const confidence = mbfcFound ? 0.5 : 0.3;
          console.log('[SSE] Phase B MBFC found?', mbfcFound, 'details:', biasResults.length);
          writeEvent('mbfc', {
            biasBreakdown: biasCount,
            details: biasResults,
            urlsChecked: urls.length,
            overallScore: { score: provisionalScore, label: labelForScore(provisionalScore), confidence },
          });

          // Phase C: Discussion (batched)
          console.log('[SSE] Phase C starting');
          const urlBiasMap: Record<string, string> = {};
          for (const r of biasResults) if (r.url && r.bias) urlBiasMap[r.url] = r.bias;
          let candidates = posts.filter(p => p?.data?.url && urlBiasMap[p.data!.url!]).slice(0, 9);
          if (!candidates.length) {
            // No MBFC—fall back to top posts by score
            candidates = posts.slice(0, 9);
          }
          console.log('[SSE] Phase C candidates:', candidates.length);

          const total = candidates.length;
          let done = 0;
          const samples: Array<{ title?: string; url?: string; permalink?: string; bias: string; sentiment: string; engagement: number; sampleComments: string[]; aiMeta?: (SentimentResult | { provider: string; error: true }) | null; }>=[];

          const pending = [...candidates];
          const batchSize = 3;
          async function runOne(p: RedditPostNode) {
            // small jitter 100-300ms
            await new Promise(r => setTimeout(r, 100 + Math.floor(Math.random()*200)));
            const d = p.data || {};
            const biasLabel = urlBiasMap[d.url as string];
            if (!d.permalink) { done++; return; }
            const thread = await fetchComments(d.permalink!, token, 10000);
            const bodies = thread ? extractTopLevelCommentBodies(thread) : [];
            const heuristic = heuristicSentiment(bodies);
            let sentiment = heuristic as 'positive'|'negative'|'neutral'|string;
            let aiMeta: (SentimentResult | { provider: string; error: true }) | null = null;
            try {
              if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {
                const title = d.title || '';
                const textBlob = `TITLE: ${title}\n---\n` + bodies.join('\n---\n');
                const promptOverride = biasLabel
                  ? undefined
                  : 'You are a political discussion sentiment analyzer. Classify the OVERALL stance of the following Reddit comment aggregate toward the POST TITLE. Output strict JSON with keys sentiment(one of positive|negative|neutral), score(-1..1 number), reasoning(brief phrase).';
                const ai = await analyzeSentiment({ text: textBlob, promptOverride });
                if (['positive','negative','neutral'].includes(ai.sentiment)) sentiment = ai.sentiment;
                aiMeta = ai;
              }
            } catch { aiMeta = { provider: 'error', error: true }; }
            const engagement = (d.num_comments || 0) + (d.score || 0) / 100;
            samples.push({ title: d.title || '', url: d.url!, permalink: d.permalink!, bias: biasLabel, sentiment, engagement, sampleComments: bodies.slice(0,3), aiMeta });
            done++;
          }
          while (pending.length) {
            const batch = pending.splice(0, Math.min(batchSize, pending.length));
            await Promise.all(batch.map(runOne));
            // compute progressive lean
            let totalWeighted = 0; let totalEngagement = 0;
            for (const s of samples) {
              const postBiasScore = mapBiasToScore(s.bias);
              const mult = mapSentimentToMultiplier(s.sentiment);
              if (mult === 0) continue;
              const postLean = postBiasScore * mult;
              totalWeighted += postLean * s.engagement;
              totalEngagement += s.engagement;
            }
            let leanRaw = 0; let leanNormalized = 5;
            if (totalEngagement > 0) {
              const avgRaw = totalWeighted / totalEngagement;
              leanRaw = avgRaw;
              leanNormalized = normalizeOverall(avgRaw);
            }
            const overallScore = { score: leanNormalized, label: labelForScore(leanNormalized), confidence: Math.min(0.95, 0.4 + 0.07 * samples.length) };
            writeEvent('discussion', { discussionSignal: { samples, leanRaw, leanNormalized, label: overallScore.label }, overallScore, progress: { done, total } });
            console.log('[SSE] Phase C progress', done, '/', total);
          }

          writeEvent('done', { ok: true });
          console.log('[SSE] done');
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'stream failed';
          writeEvent('error', { message });
        } finally {
          controller.close();
        }
      },
      cancel() {}
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no' // hint proxies to not buffer SSE
      }
    });
  } catch {
    return new Response('Internal Server Error', { status: 500 });
  }
}
