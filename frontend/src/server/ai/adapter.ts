import { deepseekSentiment } from './providers/deepseek';
import { openAISentiment } from './providers/openai';
import { DEFAULT_PROMPT_VERSION, type PromptKey } from './prompts';
import type { Alignment, BiasLabel } from '@/lib/types';
import { sha256 } from '@/server/hash';
import { getCache, setCache } from '@/server/cache';
import { AI_CACHE_TTL_MS } from '@/server/config';
import { saveAIResult } from '@/server/persistence';

export type SentimentResult = {
  provider: string;
  model: string;
  sentiment: 'positive' | 'negative' | 'neutral' | string;
  score: number;
  reasoning: string;
  // Alignment-first schema (v1 updated):
  alignment?: Alignment;
  alignmentScore?: number; // -1..1
  confidence?: number;     // 0..1
  stanceLabel?: BiasLabel | 'none';
  stanceScore?: number | null; // 0..10 or null
};

export async function analyzeSentiment({ text, promptKey, promptVersion, promptOverride }: { text: string; promptKey?: PromptKey; promptVersion?: string; promptOverride?: string }): Promise<SentimentResult> {
  if (!text || !text.trim()) {
    return { provider: 'heuristic', model: 'none', sentiment: 'neutral', score: 0, reasoning: 'empty text' };
  }
  const order: Array<'deepseek' | 'openai'> = ['deepseek', 'openai'];

  // Build a stable cache key from prompt identity + input hash
  const key: PromptKey = (promptKey || 'stance_source') as PromptKey;
  const version = promptVersion || DEFAULT_PROMPT_VERSION;
  const hash = sha256(`${key}|${version}|${promptOverride || ''}|${text}`);
  const cacheKey = `ai:v1:${key}:${version}:${hash}`;

  const hit = await getCache<SentimentResult>(cacheKey);
  if (hit) return hit;
  let lastErr: unknown;
  for (const prov of order) {
    try {
  const common = { text, promptKey: key, promptVersion: version, promptOverride };

  const result = prov === 'deepseek'
    ? await deepseekSentiment(common) as SentimentResult
    : await openAISentiment(common) as SentimentResult;

  // Cache in memory for quick reuse
  await setCache(cacheKey, result, AI_CACHE_TTL_MS);
  // Persist to MySQL asynchronously (best-effort)
  try {
    await saveAIResult({
      hash,
      provider: result.provider,
      model: result.model,
      promptKey: key,
      promptVersion: version,
      alignment: result.alignment ?? null,
      alignmentScore: result.alignmentScore == null ? null : String(result.alignmentScore),
      stanceLabel: result.stanceLabel ?? null,
      stanceScore: result.stanceScore == null ? null : String(result.stanceScore),
      confidence: result.confidence == null ? null : String(result.confidence),
      meta: { sentiment: result.sentiment, score: result.score, reasoning: result.reasoning },
    });
  } catch {}
  return result;
    } catch (e) { lastErr = e; }
  }
  return { provider: 'fallback', model: 'none', sentiment: 'neutral', score: 0, reasoning: lastErr ? 'all providers failed' : 'no providers configured' };
}
