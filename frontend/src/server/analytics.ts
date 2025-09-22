/**
 * Analytics helpers for charting `analysis_results`.
 */
import { getDb } from '@/server/db/client';
import { analysisResults } from '@/server/db/schema';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';

export type SeriesPoint = { t: string; biasScore: number | null; confidence: number | null };

export type SeriesOptions = {
  sinceIso?: string;
  limit?: number;
  groupBy?: 'none' | 'day';
};

/**
 * Fetch time series of biasScore/confidence for a subreddit since `sinceIso` (UTC).
 */
export async function getSubredditSeries(subreddit: string, sinceIso?: string, limit = 200): Promise<SeriesPoint[]> {
  return getSubredditSeriesWithOptions(subreddit, { sinceIso, limit, groupBy: 'none' });
}

/**
 * Fetch time series for a subreddit with optional grouping.
 * - groupBy 'none': raw rows ordered by time
 * - groupBy 'day': averages per UTC day
 */
export async function getSubredditSeriesWithOptions(subreddit: string, opts?: SeriesOptions): Promise<SeriesPoint[]> {
  const db = getDb();
  const base = subreddit.startsWith('r/') ? subreddit.slice(2) : subreddit;
  const names = [base, `r/${base}`];
  const since = opts?.sinceIso ? new Date(opts.sinceIso) : undefined;
  const limit = typeof opts?.limit === 'number' && opts.limit > 0 ? Math.min(opts.limit, 1000) : 200;
  const groupBy = opts?.groupBy ?? 'none';

  const where = since
    ? and(inArray(analysisResults.communityName, names), eq(analysisResults.platform, 'reddit'), gte(analysisResults.analysisDate, since))
    : and(inArray(analysisResults.communityName, names), eq(analysisResults.platform, 'reddit'));

  if (groupBy === 'day') {
    const dayExpr = sql`DATE(${analysisResults.analysisDate})`;
    const rows = await db
      .select({
        day: dayExpr,
        biasScore: sql`AVG(${analysisResults.biasScore})`,
        confidence: sql`AVG(${analysisResults.confidence})`,
      })
      .from(analysisResults)
      .where(where)
      .groupBy(dayExpr)
      .orderBy(dayExpr)
      .limit(limit);
    return rows.map((r) => {
      const t = typeof r.day === 'string' ? new Date(r.day + 'T00:00:00.000Z').toISOString() : new Date().toISOString();
      const bias = r.biasScore as unknown;
      const conf = r.confidence as unknown;
      return {
        t,
        biasScore: bias == null ? null : Number(bias),
        confidence: conf == null ? null : Number(conf),
      };
    });
  }

  const rows = await db
    .select({
      analysisDate: analysisResults.analysisDate,
      biasScore: analysisResults.biasScore,
      confidence: analysisResults.confidence,
    })
    .from(analysisResults)
    .where(where)
    .orderBy(analysisResults.analysisDate)
    .limit(limit);
  return rows.map((r) => ({
    t: r.analysisDate?.toISOString() ?? new Date().toISOString(),
    biasScore: r.biasScore == null ? null : Number(r.biasScore),
    confidence: r.confidence == null ? null : Number(r.confidence),
  }));
}
