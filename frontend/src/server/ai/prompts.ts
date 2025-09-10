export type ProviderId = 'deepseek' | 'openai';
export type PromptKey = 'stance_source' | 'stance_title';

export const DEFAULT_PROMPT_VERSION = 'v1';

const PROMPT_VERSIONS: Record<string, Record<PromptKey, string>> = {
  v1: {
    // Alignment to editorial stance (JSON-only). The text payload will include:
    // - For stance_source: SOURCE_BIAS: label=<MBFC label>, score=<0..10>
    // - Always: TITLE and COMMENTS body
    // Your task: determine whether the comment aggregate aligns with the editorial stance.
    // Output strict JSON with keys:
    //   alignment: one of aligns|opposes|mixed|unclear
    //   alignment_score: number in [-1, 1]
    //   confidence: number in [0, 1]
    //   reasoning: brief phrase
    stance_source:
      'You are a political discussion sentiment and editorial alignment analyzer. Determine whether the Reddit comment aggregate aligns with the editorial stance of the ORIGINAL LINKED SOURCE. Use the provided SOURCE_BIAS as the source stance context. Respond with strict JSON only, using keys alignment(one of aligns|opposes|mixed|unclear), alignment_score(number -1..1), confidence(number 0..1), reasoning(brief).',
    // Two-step: first infer the title stance, then judge alignment of comments against it.
    // Output strict JSON with keys:
    //   stance_label: one of ["Extreme-Left","Left","Left-Center","Least Biased","Right-Center","Right","Extreme-Right"] or "none"
    //   stance_score: number in 0..10 or null
    //   alignment: one of aligns|opposes|mixed|unclear
    //   alignment_score: number in [-1, 1]
    //   confidence: number in [0, 1]
    //   reasoning: brief phrase
    stance_title:
      'You are a political discussion sentiment and editorial alignment analyzer. First, infer the political/editorial stance expressed by the POST TITLE. Then, determine whether the Reddit comment aggregate aligns with that inferred stance. Respond with strict JSON only, using keys stance_label(one of ["Extreme-Left","Left","Left-Center","Least Biased","Right-Center","Right","Extreme-Right"] or "none"), stance_score(number 0..10 or null), alignment(one of aligns|opposes|mixed|unclear), alignment_score(number -1..1), confidence(number 0..1), reasoning(brief).',
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
