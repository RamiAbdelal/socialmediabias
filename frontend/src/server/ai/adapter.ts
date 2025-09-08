import { deepseekSentiment } from './providers/deepseek';
import { openAISentiment } from './providers/openai';

export type SentimentResult = {
  provider: string;
  model: string;
  sentiment: 'positive' | 'negative' | 'neutral' | string;
  score: number;
  reasoning: string;
};

export async function analyzeSentiment({ text, promptOverride }: { text: string; promptOverride?: string }): Promise<SentimentResult> {
  if (!text || !text.trim()) {
    return { provider: 'heuristic', model: 'none', sentiment: 'neutral', score: 0, reasoning: 'empty text' };
  }
  const order: Array<'deepseek' | 'openai'> = ['deepseek', 'openai'];
  let lastErr: unknown;
  for (const prov of order) {
    try {
  if (prov === 'deepseek') return await deepseekSentiment({ text, promptOverride }) as SentimentResult;
  if (prov === 'openai') return await openAISentiment({ text, promptOverride }) as SentimentResult;
    } catch (e) { lastErr = e; }
  }
  return { provider: 'fallback', model: 'none', sentiment: 'neutral', score: 0, reasoning: lastErr ? 'all providers failed' : 'no providers configured' };
}
