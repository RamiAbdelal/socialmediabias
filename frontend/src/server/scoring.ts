import type { Alignment, BiasLabel } from '@/lib/types';

/**
 * Ordered bias labels used for 7 equal segments across 0..10.
 * Single source of truth for label ordering (left → right).
 */
export const BIAS_LABELS: ReadonlyArray<string> = [
  'Extreme-Left',
  'Left',
  'Left-Center',
  'Least Biased',
  'Right-Center',
  'Right',
  'Extreme-Right'
];

/**
 * Map a 0..10 score to a categorical label using the same 7 equal segments
 * as mapBiasToScore: Extreme-Left .. Extreme-Right.
 */
/**
 * Map a 0..10 continuous score to a categorical bias label.
 * Segments the 0..10 range into 7 equal bins and indexes into BIAS_LABELS.
 */
export function labelForScore(s: number) {
  const score = Math.min(10, Math.max(0, s));
  const step = 10 / 7; // ≈ 1.4285714
  const idx = Math.min(6, Math.floor(score / step));
  return BIAS_LABELS[idx];
}

/**
 * Convert MBFC bias label to a 0..10 score.
 * We partition the 0..10 range into 7 equal segments (Extreme-Left .. Extreme-Right),
 * and assign each label to the midpoint of its segment so they are evenly spaced.
 * "Questionable" is currently hardcoded to 7.
 */
/**
 * Canonical bias → score mapping used throughout the app (0..10 scale).
 * Includes Questionable at 7 by policy.
 */
/**
 * Canonical mapping from bias label → mid-point score on 0..10.
 * Midpoints are evenly spaced across seven segments. Questionable is by policy = 7.
 */
export const BIAS_SCORE_MAP: Readonly<Record<string, number>> = {
  // Midpoints of 7 equal parts across 0..10: ((index + 0.5) * (10/7))
  'Extreme-Left': 0.71,
  'Left': 2.14,
  'Left-Center': 3.57,
  'Least Biased': 5.00,
  'Right-Center': 6.43,
  'Right': 7.86,
  'Extreme-Right': 9.29,
  // Policy choice
  'Questionable': 7,
};

/** List of all known bias labels recognized by mapBiasToScore (keys of BIAS_SCORE_MAP). */
export const KNOWN_BIAS_LABELS: ReadonlyArray<string> = Object.keys(BIAS_SCORE_MAP);

/**
 * Convert a bias label to its numeric score, or null if unknown.
 */
export function mapBiasToScore(bias?: string): number | null {
  if (typeof bias === 'string' && Object.prototype.hasOwnProperty.call(BIAS_SCORE_MAP, bias)) {
    return BIAS_SCORE_MAP[bias];
  }
  // Unknown or missing label → ignore in calculations (return null)
  return null;
}

/** Convert sentiment into a direction multiplier: positive=+1, negative=-1, neutral=0. */
/**
 * Legacy helper retained for compatibility where needed.
 */
export function mapSentimentToMultiplier(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return 1;
    case "negative":
      return -1;
    default:
      return 0;
  }
}

/** Clamp a 0..10 lean into the 0..10 range. */
/** Clamp any numeric score into the 0..10 range. */
export function normalizeOverall(avg: number) {
  return Math.min(10, Math.max(0, avg));
}

/**
 * Compute a refined lean from a base stance (0..10) using an alignment score in [-1, 1].
 * - alignmentScore = +1 keeps the base as-is
 * - alignmentScore = -1 mirrors the base across the center (5)
 * - intermediate values interpolate linearly toward the center
 */
export function computeRefinedLean(base: number, alignmentScore: number): number {
  const b = normalizeOverall(base);
  const a = Math.max(-1, Math.min(1, alignmentScore));
  const deviation = b - 5; // -5..+5
  return normalizeOverall(5 + deviation * a);
}

/** Simple lexical heuristic for sentiment across a list of comment texts. */
export function heuristicSentiment(commentTexts: string[]) {

  if (!commentTexts.length) return "neutral";

  const joined = commentTexts.join("\n").toLowerCase();

  const negativeWords = [
    "propaganda",
    "trash",
    "fake",
    "lies",
    "lying",
    "biased",
    "hack",
    "hate",
    "disgusting",
    "bad take",
    "cope",
  ];

  const positiveWords = [
    "agree",
    "true",
    "accurate",
    "based",
    "good point",
    "well said",
    "makes sense",
  ];

  let neg = 0, pos = 0;

  for (const w of negativeWords) if (joined.includes(w)) neg++;
  for (const w of positiveWords) if (joined.includes(w)) pos++;

  if (neg === 0 && pos === 0) return "neutral";
  if (neg > pos * 1.2) return "negative";
  if (pos > neg * 1.2) return "positive";

  return "neutral";
}

/**
 * Compute lean metrics from discussion samples using editorial alignment.
 *
 * Core idea:
 * 1) Determine a base stance per sample (MBFC label → score, or AI-inferred title stance).
 * 2) Apply the AI alignment score [-1, 1] to interpolate between the center and the mirrored base.
 *    refined = 5 + (base - 5) * alignmentScore
 *    where +1 keeps base, -1 mirrors across 5, 0 goes to center.
 * 3) Aggregate as an engagement-weighted average, optionally scaling by AI confidence.
 *
 * Readability notes:
 * - If no stance exists (none/unclear), we treat the sample as Least Biased (5) with a low weight.
 * - If no AI alignment exists, we default to 0 (center) to avoid noise.
 */
export function computeLean(
  samples: Array<{
    bias?: string;
    sentiment: 'positive'|'negative'|'neutral'; // kept for backward compat, but no longer used
    engagement: number;
    // Optional AI alignment metadata
    aiMeta?: {
   alignment?: Alignment;
      alignmentScore?: number; // -1..1
      confidence?: number;     // 0..1
   stanceLabel?: BiasLabel | 'none';
      stanceScore?: number | null; // 0..10
    } | null;
  }>,
  confidenceHint?: number
) {
  // Aggregate refined leans using engagement and optional AI confidence as weights
  let totalWeighted = 0;
  let totalWeight = 0;

  for (const s of samples) {
    // Determine base stance score (0..10)
    const mbfcBase = mapBiasToScore(s.bias);
    const aiBase = (s.aiMeta?.stanceScore != null
      ? s.aiMeta?.stanceScore
      : (s.aiMeta?.stanceLabel ? mapBiasToScore(s.aiMeta.stanceLabel) : null));

    let base: number | null = mbfcBase != null ? mbfcBase : (aiBase != null ? aiBase : null);

    // If stance_title produced none/unclear, treat as Least Biased with low weight
    let lowWeightCenter = false;
    if (base == null && (s.aiMeta?.stanceLabel === 'none' || s.aiMeta?.alignment === 'unclear')) {
      base = 5; // Least Biased
      lowWeightCenter = true;
    }

    if (base == null) continue; // nothing to aggregate

    // Alignment score handling
  let aScore: number | null = typeof s.aiMeta?.alignmentScore === 'number' ? s.aiMeta.alignmentScore : null;
    if (aScore == null) {
      // Fallback mapping if only categorical alignment present
      const a = s.aiMeta?.alignment;
      if (a === 'aligns') aScore = 1;
      else if (a === 'opposes') aScore = -1;
      else if (a === 'mixed') aScore = 0.25;
      else if (a === 'unclear') aScore = 0;
      else aScore = 0; // safest default
    }

    const refined = computeRefinedLean(base, aScore);

    // Weight: engagement scaled by confidence; unclear or inferred-center gets smaller weight
  const conf = typeof s.aiMeta?.confidence === 'number' ? Math.max(0, Math.min(1, s.aiMeta.confidence)) : 0.5;
    const engagement = Math.max(0, s.engagement);
    const weight = engagement * (1 + conf) * (lowWeightCenter ? 0.4 : 1);

    totalWeighted += refined * weight;
    totalWeight += weight;
  }

  const leanRaw = totalWeight > 0 ? (totalWeighted / totalWeight) : 5;
  const leanNormalized = normalizeOverall(leanRaw);

  const confidence = typeof confidenceHint === 'number'
    ? confidenceHint
    : Math.min(0.95, 0.4 + 0.07 * samples.length);

  const overallScore = { score: leanNormalized, label: labelForScore(leanNormalized), confidence };

  return { leanRaw, leanNormalized, overallScore };

}
