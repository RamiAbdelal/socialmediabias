import { NextRequest } from 'next/server';
import { getMBFCBiasForUrls, MBFCResult } from '@/server/mbfc-signal';
import { analyzeSentiment, type SentimentResult } from '@/server/ai/adapter';
import type { PromptKey } from '@/server/ai/prompts';
import { getRedditAccessToken, fetchSubredditTopPosts, fetchCommentsWithBackoff, extractTopLevelCommentBodies, type RedditPostNode } from '@/server/reddit';
import { labelForScore, computeLean, mapBiasToScore, KNOWN_BIAS_LABELS, computeRefinedLean } from '@/server/scoring';
import { getCache, setCache } from '@/server/cache';
import type { DiscussionSample } from '@/lib/types';
import { summarizeForLog } from '@/server/reddit';

export const runtime = 'nodejs';

// ----- Config (edit here) -----
const REDDIT_TOP_LIMIT = 25;
const REDDIT_TOP_TIME = 'month' as const;
const DISCUSSION_LIMIT = 6;         // total posts for Phase C
const DISCUSSION_BATCH_SIZE = 3;    // emit after each batch of N
const COMMENT_TIMEOUT_MS = 10_000;  // per-thread fetch timeout
const JITTER_MIN_MS = 50;           // min per-task jitter to smooth bursts
const JITTER_MAX_MS = 200;          // max per-task jitter to smooth bursts
const CACHE_TIME = 10 * 60 * 1000;  // seconds to cache final discussion result
// --------------------------------

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
          // Log a concise summary to avoid noisy output
          console.log('[SSE] emit', name, summarizeForLog(name, data));
        }

        try {
          // Phase A: Reddit
          const token = await getRedditAccessToken();
          const { posts } = await fetchSubredditTopPosts(subreddit, token, REDDIT_TOP_LIMIT, REDDIT_TOP_TIME);

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
          const urls: string[] = posts.
            map(p => p?.data?.url as string).
            filter((u: string) => u && /^https?:\/\//.test(u));

          let biasResults: MBFCResult[] = [];
          const biasCount: Record<string, number> = {};

          try {

            biasResults = await getMBFCBiasForUrls(urls);

            for (const r of biasResults) {
              if (r.bias) {
                biasCount[r.bias] = (biasCount[r.bias] || 0) + 1;
              }
            }

          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[SSE] MBFC lookup failed:', message);
          }
          
          // Filter unknown labels from the count map
          const filteredBiasCount = Object.fromEntries(
            Object.entries(biasCount).filter(([label]) => KNOWN_BIAS_LABELS.includes(label) || label === 'Questionable')
          ) as Record<string, number>;

          const mbfcFound = Object.keys(filteredBiasCount).length > 0;

          // Weighted average over known labels only
          const { sumWeighted, sumCount } = Object.entries(filteredBiasCount).reduce(
            (acc, [label, count]) => {
              const val = mapBiasToScore(label);
              if (val === null) return acc; // ignore unknown labels entirely
              acc.sumWeighted += val * count;
              acc.sumCount += count;
              return acc;
            },
            { sumWeighted: 0, sumCount: 0 }
          );

          const provisionalScore = sumCount > 0 ? (sumWeighted / sumCount) : null;
          const confidence = mbfcFound ? 0.5 : 0.3;

          console.log('[SSE] Phase B MBFC found', mbfcFound, 'details:', biasResults.length);

          /**
           * 
           */

          writeEvent('mbfc', {
            biasBreakdown: biasCount,
            details: biasResults,
            urlsChecked: urls.length,
            mbfcRaw: provisionalScore,
            overallScore: {
              score: provisionalScore,
              label: typeof provisionalScore === 'number' ? labelForScore(provisionalScore) : null,
              confidence
            },
          });

          // Phase C: Discussion (batched)
          console.log('[SSE] Phase C starting');
          const urlBiasMap: Record<string, string> = {};

          for (const r of biasResults) {
            if (r.url && r.bias) urlBiasMap[r.url] = r.bias;
          }

          let candidates = posts.
            filter(p => p?.data?.url && urlBiasMap[p.data!.url!]).
            slice(0, DISCUSSION_LIMIT);

          if (!candidates.length) {
            // No MBFC—fall back to top posts by score
            candidates = posts.slice(0, DISCUSSION_LIMIT);
          }
          console.log('[SSE] Phase C candidates:', candidates.length);

          // Cache check: key derived from subreddit + candidate permalinks
          const keyParts = [
            subreddit, 
            REDDIT_TOP_TIME, 
            String(DISCUSSION_LIMIT), 
            ...candidates.map(c => c?.data?.permalink || '')
          ];

          const cacheKey = 'disc:' + keyParts.join('|');

          const cached = getCache<{ 
            discussionSignal: { 
                samples: DiscussionSample[]; 
                leanRaw: number; 
                leanNormalized: number; 
                label: string 
              }, 
              overallScore: { 
                score: number; 
                label: string; 
                confidence: number 
              } 
            }
          >(cacheKey);


          if (cached) {
            writeEvent('discussion', { 
              ...cached, 
              progress: { 
                done: candidates.length, 
                total: candidates.length 
              }, cached: true 
            });

            writeEvent('done', { ok: true, cached: true });
            return;
          }

          const total = candidates.length;
          let done = 0;
          const samples: DiscussionSample[] = [];

          const pending = [...candidates];

          async function runOne(p: RedditPostNode) {
            function isSentimentResult(x: unknown): x is SentimentResult {
              return typeof x === 'object' && x !== null && 'provider' in x && 'model' in x;
            }

            // small jitter 50-200ms
            const delay = JITTER_MIN_MS + Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS));
            await new Promise(r => setTimeout(r, delay));
            const d = p.data || {};
            const biasLabel = urlBiasMap[d.url as string];

            if (!d.permalink) { done++; return; }

            const thread = await fetchCommentsWithBackoff(d.permalink!, token, COMMENT_TIMEOUT_MS);
            const bodies = thread ? extractTopLevelCommentBodies(thread) : [];

            let aiMeta: (SentimentResult | { provider: string; error: true }) | null = null;

            try {

              if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {

                const title = d.title || '';
                const commentsBlob = bodies.join('\n---\n');
                const promptKey: PromptKey = biasLabel ? 'stance_source' : 'stance_title';

                // Build context with explicit source bias when available
                const sourceBias = biasLabel ? `SOURCE_BIAS: label=${biasLabel}, score=${mapBiasToScore(biasLabel) ?? ''}` : '';
                const textBlob = [
                  sourceBias,
                  `TITLE: ${title}`,
                  '---',
                  commentsBlob
                ].filter(Boolean).join('\n');

                const ai = await analyzeSentiment({ text: textBlob, promptKey });
                aiMeta = ai;
                console.log(`[SSE] AI ${ai.provider} ${ai.model} for`, summarizeForLog('input', { title, commentCount: bodies.length }), '→', ai);
              }

            } catch { 
              aiMeta = { provider: 'error', error: true }; 
            }

            /**
             * 
             */
            const engagement = (d.num_comments || 0) + (d.score || 0) / 100;

            // Derive per-sample refined lean for display (computeLean will recompute aggregate)
            const mbfcBase = mapBiasToScore(biasLabel);
            const aiBase = (isSentimentResult(aiMeta) && typeof aiMeta.stanceScore === 'number')
              ? aiMeta.stanceScore
              : (isSentimentResult(aiMeta) && typeof aiMeta.stanceLabel === 'string'
                ? mapBiasToScore(aiMeta.stanceLabel)
                : null);
            let baseUsed: number | null = mbfcBase != null ? mbfcBase : (aiBase != null ? aiBase : null);
            if (baseUsed == null && isSentimentResult(aiMeta) && (aiMeta.stanceLabel === 'none' || aiMeta.alignment === 'unclear')) {
              baseUsed = 5;
            }
            // Map alignment category → numeric alignment score if needed
            const aScore = isSentimentResult(aiMeta) && typeof aiMeta.alignmentScore === 'number'
              ? aiMeta.alignmentScore
              : (isSentimentResult(aiMeta) && typeof aiMeta.alignment === 'string'
                ? (aiMeta.alignment === 'aligns' ? 1 : aiMeta.alignment === 'opposes' ? -1 : aiMeta.alignment === 'mixed' ? 0.25 : 0)
                : 0);
            const refinedLean = baseUsed != null ? computeRefinedLean(baseUsed, aScore) : undefined;

            // Narrow aiMeta to the alignment-capable shape for storage (or null on error)
            const aiForSample: (SentimentResult | { provider: string; error: true } | null) =
              (aiMeta && 'error' in aiMeta) ? aiMeta : (isSentimentResult(aiMeta) ? aiMeta : null);

            samples.push({ 
              title: d.title || '', url: d.url!, 
              permalink: d.permalink!, 
              bias: biasLabel, 
              sentiment: 'neutral', // legacy field unused in alignment mode
              engagement, 
              sampleComments: bodies.slice(0,3), 
              aiMeta: aiForSample as (SentimentResult | { provider: string; error: true } | null),
              refinedLean,
              refinedLabel: typeof refinedLean === 'number' ? labelForScore(refinedLean) : undefined,
              baseScoreUsed: baseUsed == null ? undefined : baseUsed,
              alignmentScoreUsed: aScore,
            });

            done++;

          }

          while (pending.length) {

            const batch = pending.splice(0, Math.min(DISCUSSION_BATCH_SIZE, pending.length));
            await Promise.all(batch.map(runOne));

            const { leanRaw, leanNormalized, overallScore } = computeLean(samples);

            const discussionSignal = { 
              discussionSignal: { 
                samples, 
                leanRaw, 
                leanNormalized, 
                label: overallScore.label 
              }, 
              overallScore, 
              progress: { done, total } 
            }

            writeEvent('discussion', discussionSignal);

            console.log('[SSE] Phase C progress', done, '/', total);

          }

          // Compute final and cache it for a short period (e.g., 10 minutes)
          const { leanRaw, leanNormalized, overallScore } = computeLean(samples);

          const discussionSignal = { 
            discussionSignal: { 
              samples, 
              leanRaw, 
              leanNormalized, 
              label: overallScore.label 
            }, 
            overallScore 
          }

          setCache(cacheKey, discussionSignal, CACHE_TIME);
          
          writeEvent('done', { ok: true });
          console.log('[SSE] done');

        } catch (e: unknown) {

          const message = e instanceof Error ? e.message : 'stream failed';
          writeEvent('error', { message });
          console.error('[SSE] error', message);

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
