import { getDb } from './db/client';
import { aiResults, analysisResults } from './db/schema';

type AIRow = {
  hash: string;
  provider: string;
  model: string;
  promptKey: string;
  promptVersion: string;
  alignment?: string | null;
  alignmentScore?: string | null;
  stanceLabel?: string | null;
  stanceScore?: string | null;
  confidence?: string | null;
  meta?: unknown;
};

type AnalysisRow = {
  communityName: string;
  platform: string;
  biasScore: string | null;
  confidence: string | null;
  analysisDate: Date;
  signalBreakdown: unknown;
};

export async function saveAIResult(row: AIRow) {
  const db = getDb();
  try {
    await db.insert(aiResults).values(row).onDuplicateKeyUpdate({ set: row });
  } catch {}
}

export async function saveSubredditAnalysis(row: AnalysisRow) {
  const db = getDb();
  try {
    await db.insert(analysisResults).values(row);
  } catch {}
}
