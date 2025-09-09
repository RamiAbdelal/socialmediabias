/** Map a normalized 0..10 score to a categorical label. */
export function labelForScore(s: number) {
  if (s <= 1.5) return "far-left";
  if (s <= 3.5) return "left";
  if (s < 6.5) return "center";
  if (s < 8.5) return "right";
  return "far-right";
}

/** Convert MBFC bias label to a -5..+5 numeric lean. */
export function mapBiasToScore(bias?: string) {
  const biasMap: Record<string, number> = {
    "Extreme-Left": -5,
    Left: -4,
    "Left-Center": -2,
    "Least Biased": 0,
    "Right-Center": 2,
    Right: 4,
    "Extreme-Right": 5,
    Questionable: 4,
  };
  return bias ? biasMap[bias] ?? 0 : 0;
}

/** Convert sentiment into a direction multiplier: positive=+1, negative=-1, neutral=0. */
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

/** Normalize a -5..+5 raw lean into a 0..10 scale. */
export function normalizeOverall(avg: number) {
  const n = ((avg + 5) / 10) * 10;
  return Math.min(10, Math.max(0, n));
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
 * Compute lean metrics from discussion samples.
 * Returns raw lean (-5..+5), normalized (0..10), and an overall score object with label and confidence.
 * Confidence may be overridden by caller; default heuristic uses sample count.
 */
export function computeLean(

  samples: Array<{ bias?: string; sentiment: 'positive'|'negative'|'neutral'; engagement: number }>,
  confidenceHint?: number
) {

  let totalWeighted = 0;
  let totalEngagement = 0;

  for (const s of samples) {
    const postBiasScore = mapBiasToScore(s.bias);
    const mult = mapSentimentToMultiplier(s.sentiment);
    if (mult === 0) continue;
    const postLean = postBiasScore * mult;
    totalWeighted += postLean * s.engagement;
    totalEngagement += s.engagement;
  }

  let leanRaw = 0;
  let leanNormalized = 5;

  if (totalEngagement > 0) {
    const avgRaw = totalWeighted / totalEngagement;
    leanRaw = avgRaw;
    leanNormalized = normalizeOverall(avgRaw);
  }

  const confidence = typeof confidenceHint === 'number' ? confidenceHint : Math.min(0.95, 0.4 + 0.07 * samples.length);

  const overallScore = { score: leanNormalized, label: labelForScore(leanNormalized), confidence };

  return { leanRaw, leanNormalized, overallScore };

}
