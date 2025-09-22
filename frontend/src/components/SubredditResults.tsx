"use client";
// ================== NEW REFACTORED COMPONENT ==================
import React, { useReducer, useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import RedditSignalCard from './RedditSignalCard';
import { FilterPanel, filterReducer, initialFilterState, applyFilters } from './FilterPanel';
import type { MBFCDetail, SubredditResultsProps, RedditSignal } from '../lib/types';
import { Reddit } from '../lib/types';
import { isImageUrl, isGalleryUrl, defaultRedditSignal } from '../lib/utils';
import { StatusMessage } from './StatusMessage';
import { ChartLineInteractive } from '@/components/chart-line-interactive';
import { useAnalysis } from '@/context/AnalysisContext';
import { DataTableDiscussion } from './DataTableDiscussion';
import type { DiscussionRow } from '@/lib/types';

const SubredditResults: React.FC<SubredditResultsProps> = ({ subreddit, result, error, isLoading }) => {
  
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);
  
  console.log('SubredditResults render', { subreddit, result, error, isLoading });

  // Merge MBFC + Reddit post data
  const allDetails: RedditSignal[] = React.useMemo(() => {
    const details = result?.details || [];
    const redditPosts = result?.redditPosts || [];
    const mbfcByUrl = new Map<string, MBFCDetail>();
    for (const d of details) if (d.url) mbfcByUrl.set(d.url, d);
    const combined: RedditSignal[] = [];
    for (const p of redditPosts) {
      if (p.url) {
        const mbfc = mbfcByUrl.get(p.url);
        combined.push({ ...defaultRedditSignal, ...mbfc, ...p });
        mbfcByUrl.delete(p.url);
      }
    }
    for (const d of mbfcByUrl.values()) combined.push({ ...defaultRedditSignal, ...d });
    return combined;
  }, [result]);

  const filteredDetails = useMemo(() => applyFilters(allDetails, filters), [allDetails, filters]);

  type SeriesPoint = { t: string; biasScore: number | null; confidence: number | null };
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [seriesLoading, setSeriesLoading] = useState<boolean>(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [groupBy, setGroupBy] = useState<'none'|'day'>('day');

  /**
   * Fetch and set analytics time-series for the current subreddit.
   * Invoked on mount and after SSE 'done' to hydrate the chart with
   * newly persisted analysis results.
   */
  const loadSeries = useCallback(async (signal?: AbortSignal) => {
    if (!subreddit) return;
    setSeriesLoading(true);
    setSeriesError(null);
    try {
      const sinceIso = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        limit: '500',
        since: sinceIso,
        groupBy,
      });
      const res = await fetch(`/api/analytics/subreddit/${encodeURIComponent(String(subreddit))}?${params.toString()}`, {
        cache: 'no-store',
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSeries((json?.data ?? []) as SeriesPoint[]);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setSeriesError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSeriesLoading(false);
    }
  }, [subreddit, rangeDays, groupBy]);

  useEffect(() => {
    const ac = new AbortController();
    loadSeries(ac.signal);
    return () => ac.abort();
  }, [subreddit, loadSeries, rangeDays, groupBy]);

  // When SSE completes ('done' → phase becomes 'ready'), refresh analytics to hydrate chart
  const { phase } = useAnalysis();
  useEffect(() => {
    if (phase !== 'ready') return;
    // slight delay to ensure server persisted the new analysis
    const t = setTimeout(() => {
      void loadSeries();
    }, 200);
    return () => clearTimeout(t);
  }, [phase, loadSeries]);

  // OG Image logic (unchanged, simplified)
  async function fetchOgImage(url: string): Promise<string | null> {
    try { const r = await fetch(`/api/og-image?url=${encodeURIComponent(url)}`); if (!r.ok) return null; const j = await r.json(); return j.ogImage || null; } catch { return null; }
  }
  const [ogImages, setOgImages] = useState<Record<string,string|null>>({});
  useEffect(() => {
    const urlsToFetch = allDetails.filter(d => d.url && !isImageUrl(d.url) && !isGalleryUrl(d.url) && !(d.url in ogImages)).map(d => d.url as string);
    if (!urlsToFetch.length) return;
    urlsToFetch.forEach(async url => {
      setOgImages(p => ({ ...p, [url]: null }));
      const og = await fetchOgImage(url);
      setOgImages(p => ({ ...p, [url]: og }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDetails]);

  function isRedditCommentPermalink(permalink: string) {
    if (!permalink) return false; const parts = permalink.split('/').filter(Boolean); return parts.length >= 4 && parts[0] === 'r' && parts[2] === 'comments';
  }
  async function fetchRedditCommentBody(permalink: string): Promise<string|null> {
    try { const r = await fetch(`/api/reddit-comment?permalink=${encodeURIComponent(permalink)}`); if (!r.ok) return null; const j = await r.json(); return j; } catch { return null; }
  }
  const [commentBodies, setCommentBodies] = useState<Record<string, string | null | { body: Reddit.APIResponse } | undefined>>({});
  const [openCommentPermalink, setOpenCommentPermalink] = useState<string|null>(null);

const statusMessage = (
    <StatusMessage />
)

  // Safe fallbacks for possibly-null values during progressive SSE updates
  const overallScoreValue: number = typeof result?.overallScore?.score === 'number' ? result!.overallScore!.score : 5;
  const overallConfidencePct: number = typeof result?.overallScore?.confidence === 'number'
    ? Math.round(result!.overallScore!.confidence * 100)
    : 0;

  return (
    <div>
      {error && (
        <div className="rounded-lg p-4 mb-8 bg-destructive/15 border border-destructive/40">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            </div>
            <div className="ml-3">
        <h3 className="text-sm font-medium text-destructive-foreground">Analysis Error</h3>
        <div className="mt-2 text-sm text-destructive-foreground/80">{error}</div>
            </div>
          </div>
        </div>
      )}
  
      <Card className="p-0 overflow-hidden bg-card/70 border border-border/60 backdrop-blur-sm">
        <CardHeader className="grid grid-cols-1 md:grid-cols-1 gap-6 p-6 pb-4 relative overflow-hidden">
          <h2 className="text-center text-2xl font-semibold">{statusMessage}</h2>
        </CardHeader>
        <div className="h-px w-full bg-border" />

      {result && result.overallScore && (

        <>
        {/* Overall Bias Score */}
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg shadow-xl p-4 bg-muted/30 border border-border/60">
              <h3 className="text-lg font-medium mb-2 text-foreground">Overall Bias Score</h3>
              <div className={`text-4xl font-bold bg-gradient-to-r from-primary via-accent to-accent bg-clip-text text-transparent`}>{overallScoreValue.toFixed(1)}/10</div>
              <div className="capitalize text-muted-foreground">{result.overallScore.label}</div>
            </div>
            <div className="rounded-lg shadow-xl p-4 bg-muted/30 border border-border/60">
              <h3 className="text-lg font-medium mb-2 text-foreground">Confidence</h3>
              <div className={`text-4xl font-semibold bg-gradient-to-r from-primary via-accent to-accent bg-clip-text text-transparent`}>{overallConfidencePct}%</div>
              <div className="text-muted-foreground">Analysis confidence</div>
            </div>
          </div>
        </CardBody>

        {/* Historical Chart */}
        <CardBody className="p-6 pt-0">
          <div className="rounded-lg p-4 bg-muted/30 border border-border/60">
            <div className="flex items-center justify-between mb-2 gap-3">
              <h3 className="text-lg font-medium text-foreground">Historical Bias & Confidence</h3>
              <div className="flex items-center gap-2 text-xs">
                <label className="text-muted-foreground">Range:</label>
                <select
                  className="bg-background/60 border border-border/60 rounded px-2 py-1"
                  value={rangeDays}
                  onChange={e => setRangeDays(Number(e.target.value) as 7|30|90)}
                >
                  <option value={7}>7d</option>
                  <option value={30}>30d</option>
                  <option value={90}>90d</option>
                </select>
                <label className="text-muted-foreground ml-2">Group:</label>
                <select
                  className="bg-background/60 border border-border/60 rounded px-2 py-1"
                  value={groupBy}
                  onChange={e => setGroupBy(e.target.value as 'none'|'day')}
                >
                  <option value="day">per-day</option>
                  <option value="none">raw</option>
                </select>
                <a
                  href={`/api/analytics/subreddit/${encodeURIComponent(String(subreddit))}?since=${encodeURIComponent(new Date(Date.now() - rangeDays * 86400000).toISOString())}&limit=1000&groupBy=${groupBy}&format=csv`}
                  className="ml-2 underline text-primary"
                >
                  Download CSV
                </a>
                {seriesLoading && <span className="text-muted-foreground">Loading…</span>}
              </div>
            </div>
            {seriesError ? (
              <div className="text-sm text-destructive">{seriesError}</div>
            ) : (
              <ChartLineInteractive data={series} />
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              <a href={`/analytics/r/${encodeURIComponent(String(subreddit))}`} className="underline">View full analytics</a>
            </div>
          </div>
        </CardBody>

        {/* Discussion Sentiment */}
        <CardBody className="px-6 py-0">
          {result.discussionSignal && (
            <div className="mb-6">
              {/* <h3 className="text-lg font-medium text-foreground pb-4">Discussion Sentiment</h3> */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="rounded-lg p-4 bg-muted/30 border border-border/60"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Normalized Lean</div><div className="text-2xl font-semibold text-foreground">{result.discussionSignal.leanNormalized.toFixed(2)} / 10</div><div className="text-sm capitalize text-muted-foreground">{result.discussionSignal.label}</div></div>
                <div className="rounded-lg p-4 bg-muted/30 border border-border/60"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Raw Lean (MBFC)</div><div className="text-2xl font-semibold text-foreground">{typeof result.mbfcRaw === 'number' ? result.mbfcRaw.toFixed(2) : '—'}</div><div className="text-xs text-muted-foreground">Average across known MBFC labels</div></div>
                <div className="rounded-lg p-4 bg-muted/30 border border-border/60"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Samples</div><div className="text-2xl font-semibold text-foreground">{result.discussionSignal.samples.length}</div><div className="text-xs text-muted-foreground">posts analyzed</div></div>
              </div>
              <div className="overflow-x-auto">
                {(() => {
                  const rows: DiscussionRow[] = result.discussionSignal!.samples.map((s) => ({
                    id: s.permalink,
                    title: s.title,
                    permalink: s.permalink,
                    bias: s.bias,
                    alignment: s.aiMeta?.alignment,
                    refinedLabel: s.refinedLabel,
                    engagement: s.engagement,
                    sampleComments: s.sampleComments,
                  }));
                  return <DataTableDiscussion data={rows} />;
                })()}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Editorial alignment (aligns/opposes/mixed/unclear) with per-sample refined label based on MBFC/title stance.</p>
            </div>
          )}

          {Object.keys(result?.biasBreakdown || {}).length > 0 && (
            <FilterPanel
              allDetails={allDetails}
              biasBreakdown={result.biasBreakdown}
              filters={filters}
              dispatch={dispatch}
            />
          )}
          
        </CardBody>

        <div className="h-px w-full bg-border" />
        {filteredDetails.length > 0 && (
          <CardBody className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {filteredDetails.map((d, i) => (
                <RedditSignalCard
                  key={i}
                  d={d}
                  ogImages={ogImages}
                  commentBodies={commentBodies}
                  setCommentBodies={setCommentBodies}
                  fetchRedditCommentBody={fetchRedditCommentBody}
                  isRedditCommentPermalink={isRedditCommentPermalink}
                  openCommentPermalink={openCommentPermalink}
                  setOpenCommentPermalink={setOpenCommentPermalink}
                />
              ))}
            </div>
          </CardBody>
        )}

        <div className="text-sm flex flex-wrap gap-4 mt-4 p-6 pt-0 text-muted-foreground">
          <span>Analyzed: <span className="font-semibold text-foreground">{result.communityName}</span> on <span className="font-semibold text-foreground">{result.platform}</span></span>
          {result.analysisDate && <span>Date: <span className="text-foreground/80">{new Date(result.analysisDate).toLocaleString()}</span></span>}
          {typeof result.totalPosts === 'number' && <span>Total Posts: <span className="text-foreground/80">{result.totalPosts}</span></span>}
          {typeof result.urlsChecked === 'number' && <span>URLs Checked: <span className="text-foreground/80">{result.urlsChecked}</span></span>}
        </div>
        </>


    
      )}


      </Card>  
    </div>
  );
};

export default SubredditResults;
