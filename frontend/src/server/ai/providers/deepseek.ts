import { resolvePrompt, DEFAULT_PROMPT_VERSION, type PromptKey } from '../prompts';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

export async function deepseekSentiment({ text, promptKey, promptVersion, promptOverride }: { text: string; promptKey?: PromptKey; promptVersion?: string; promptOverride?: string }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY missing');
  const basePrompt = resolvePrompt('deepseek', (promptKey || 'stance_source') as PromptKey, promptVersion || DEFAULT_PROMPT_VERSION, promptOverride);
  const prompt = `${basePrompt}\nText:\n${text.slice(0, 8000)}`;
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: 'You output only JSON. No prose.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    max_tokens: 150
  };
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Deepseek error: ${res.status} ${errTxt}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Deepseek empty response');
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error('Deepseek non JSON response'); }
  const obj = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
  return {
    provider: 'deepseek',
    model: DEEPSEEK_MODEL,
    sentiment: (typeof obj['sentiment'] === 'string' ? obj['sentiment'] : 'neutral') as string,
    score: (typeof obj['score'] === 'number' ? (obj['score'] as number) : 0),
    reasoning: (typeof obj['reasoning'] === 'string' ? (obj['reasoning'] as string) : ''),
  } as const;
}
