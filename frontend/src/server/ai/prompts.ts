export type ProviderId = 'deepseek' | 'openai';
export type PromptKey = 'stance_source' | 'stance_title';

export const DEFAULT_PROMPT_VERSION = 'v1';

const PROMPT_VERSIONS: Record<string, Record<PromptKey, string>> = {
  v1: {
    stance_source:
      'You are a political discussion sentiment analyzer. Classify the OVERALL stance of the following Reddit comment aggregate toward the ORIGINAL LINKED SOURCE. Output strict JSON with keys sentiment(one of positive|negative|neutral), score(-1..1 number), reasoning(brief phrase).',
    stance_title:
      'You are a political discussion sentiment analyzer. Classify the OVERALL stance of the following Reddit comment aggregate toward the POST TITLE. Output strict JSON with keys sentiment(one of positive|negative|neutral), score(-1..1 number), reasoning(brief phrase).',
  },
};

// Optional provider-specific overrides by version/key
const PROVIDER_OVERRIDES: Partial<Record<ProviderId, Record<string, Partial<Record<PromptKey, string>>>>> = {
  // Example shape (empty by default):
  // openai: { v1: { stance_source: '...' } },
  // deepseek: { v1: { stance_title: '...' } },
};

export function defaultPrompt(key: PromptKey, version: string = DEFAULT_PROMPT_VERSION): string {
  const v = PROMPT_VERSIONS[version];
  if (!v) throw new Error(`Unknown prompt version: ${version}`);
  const p = v[key];
  if (!p) throw new Error(`Unknown prompt key: ${key}`);
  return p;
}

export function resolvePrompt(
  provider: ProviderId,
  key: PromptKey,
  version: string = DEFAULT_PROMPT_VERSION,
  override?: string
): string {
  if (override && override.trim()) return override;
  const prov = PROVIDER_OVERRIDES[provider]?.[version]?.[key];
  if (prov && prov.trim()) return prov;
  return defaultPrompt(key, version);
}
