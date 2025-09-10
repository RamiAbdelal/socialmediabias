import { deepseekSentiment } from './providers/deepseek';
import { openAISentiment } from './providers/openai';
import { DEFAULT_PROMPT_VERSION, type PromptKey } from './prompts';
import type { Alignment, BiasLabel } from '@/lib/types';

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
  let lastErr: unknown;
  for (const prov of order) {
    try {
  const common = { text, promptKey: (promptKey || 'stance_source') as PromptKey, promptVersion: promptVersion || DEFAULT_PROMPT_VERSION, promptOverride };

  if (prov === 'deepseek') return await deepseekSentiment(common) as SentimentResult;
  if (prov === 'openai') return await openAISentiment(common) as SentimentResult;
    } catch (e) { lastErr = e; }
  }
  return { provider: 'fallback', model: 'none', sentiment: 'neutral', score: 0, reasoning: lastErr ? 'all providers failed' : 'no providers configured' };
}
