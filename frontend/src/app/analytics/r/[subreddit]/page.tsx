import { ChartLineInteractive } from '@/components/chart-line-interactive';
import { getSubredditSeriesWithOptions } from '@/server/analytics';

export default async function Page({ params }: { params: Promise<{ subreddit: string }> }) {
  const p = await params;
  const subreddit = decodeURIComponent(p.subreddit);
  const sinceIso = new Date(Date.now() - 30 * 86400000).toISOString();
  const data = await getSubredditSeriesWithOptions(subreddit, { sinceIso, limit: 1000, groupBy: 'day' });
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{`Analytics for r/${subreddit}`}</h1>
        <p className="text-sm text-gray-500">Bias score (0–10) and confidence over time</p>
      </div>
      <div className="text-xs text-muted-foreground">
        <a
          href={`/api/analytics/subreddit/${encodeURIComponent(subreddit)}?since=${encodeURIComponent(sinceIso)}&limit=1000&groupBy=day&format=csv`}
          className="underline"
        >
          Download CSV (last 30 days)
        </a>
      </div>
      <ChartLineInteractive data={data} />
    </div>
  );
}
