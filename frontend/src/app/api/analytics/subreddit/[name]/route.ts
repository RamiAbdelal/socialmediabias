import { NextRequest } from 'next/server';
import { getSubredditSeries, getSubredditSeriesWithOptions } from '@/server/analytics';

export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const { name: rawName } = await context.params;
    const url = new URL(req.url);
    const since = url.searchParams.get('since') || undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(1000, Number(limitParam))) : 200;
    const groupBy = (url.searchParams.get('groupBy') as 'none' | 'day' | null) || 'none';
    const format = url.searchParams.get('format') || 'json';
    const name = decodeURIComponent(rawName);
    const data = await getSubredditSeriesWithOptions(name, { sinceIso: since, limit, groupBy });
    if (format === 'csv') {
      const header = 't,biasScore,confidence\n';
      const lines = data.map(d => `${d.t},${d.biasScore ?? ''},${d.confidence ?? ''}`).join('\n');
      return new Response(header + lines, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }
    return Response.json({ ok: true, name, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, message: msg }, { status: 500 });
  }
}
