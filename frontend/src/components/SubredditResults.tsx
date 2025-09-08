// ================== NEW REFACTORED COMPONENT ==================
import React, { useReducer, useMemo, useState, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RedditPostsSection from './RedditPostsSection';
import RedditSignalCard from './RedditSignalCard';
import { FilterPanel, filterReducer, initialFilterState, applyFilters } from './FilterPanel';
import type { MBFCDetail, SubredditResultsProps, RedditSignal } from '../lib/types';
import { Reddit } from '../lib/types';
import { isImageUrl, isGalleryUrl, defaultRedditSignal, getBiasColor, getConfidenceColor } from '../lib/utils';

const SubredditResults: React.FC<SubredditResultsProps> = ({ subreddit, result, error, isLoading }) => {
  const { communityName, phase, discussionProgress } = useAnalysis();
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);

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

  return (
    <div className="mb-8">
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
      {isLoading && (
        <div className="text-lg mb-8 text-muted-foreground">
          {phase === 'digging' ? (
            <>Digging deeper for r/{communityName}... {discussionProgress ? `(${discussionProgress.done}/${discussionProgress.total})` : ''}</>
          ) : (
            <>Analyzing {communityName}...</>
          )}
        </div>
      )}
      {result && result.overallScore && (
  <Card className="p-0 overflow-hidden bg-card/70 border border-border/60 backdrop-blur-sm">
          <CardHeader className="grid grid-cols-1 md:grid-cols-1 gap-6 p-6 pb-4">
            <h2 className="text-center text-2xl font-semibold">r/{subreddit}</h2>
          </CardHeader>
          <div className="h-px w-full bg-border" />
          <CardBody className="p-6 pb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg shadow-xl p-4 bg-muted/30 border border-border/60">
                <h3 className="text-lg font-medium mb-2 text-foreground">Overall Bias Score</h3>
                <div className={`text-4xl font-bold ${getBiasColor(result.overallScore.score)} bg-gradient-to-r from-primary via-accent to-accent bg-clip-text text-transparent`}>{result.overallScore.score.toFixed(1)}/10</div>
                <div className="capitalize text-muted-foreground">{result.overallScore.label}</div>
              </div>
              <div className="rounded-lg shadow-xl p-4 bg-muted/30 border border-border/60">
                <h3 className="text-lg font-medium mb-2 text-foreground">Confidence</h3>
                <div className={`text-4xl font-semibold ${getConfidenceColor(result.overallScore.confidence)} bg-gradient-to-r from-primary via-accent to-accent bg-clip-text text-transparent`}>{Math.round(result.overallScore.confidence * 100)}%</div>
                <div className="text-muted-foreground">Analysis confidence</div>
              </div>
            </div>
          </CardBody>
          <CardBody className="px-6 py-0">
            {result.discussionSignal && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 text-foreground">Discussion Sentiment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-lg p-4 bg-muted/30 border border-border/60"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Normalized Lean</div><div className="text-2xl font-semibold text-foreground">{result.discussionSignal.leanNormalized.toFixed(2)} / 10</div><div className="text-sm capitalize text-muted-foreground">{result.discussionSignal.label}</div></div>
                  <div className="rounded-lg p-4 bg-muted/30 border border-border/60"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Raw Lean (-5..5)</div><div className="text-2xl font-semibold text-foreground">{result.discussionSignal.leanRaw.toFixed(2)}</div><div className="text-xs text-muted-foreground">Weighted by engagement</div></div>
                  <div className="rounded-lg p-4 bg-muted/30 border border-border/60"><div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Samples</div><div className="text-2xl font-semibold text-foreground">{result.discussionSignal.samples.length}</div><div className="text-xs text-muted-foreground">posts analyzed</div></div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/40">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left p-2 font-medium">Post Title</th>
                        <th className="text-left p-2 font-medium">MBFC Bias</th>
                        <th className="text-left p-2 font-medium">Sentiment</th>
                        <th className="text-left p-2 font-medium">AI</th>
                        <th className="text-left p-2 font-medium">Engagement</th>
                        <th className="text-left p-2 font-medium">Comments (sample)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.discussionSignal.samples.map(s => (
                        <tr key={s.permalink} className="border-t border-border/50 align-top">
                          <td className="p-2 max-w-xs"><a href={`https://reddit.com${s.permalink}`} target="_blank" rel="noopener" className="text-primary hover:underline">{s.title}</a></td>
                          <td className="p-2 text-xs whitespace-nowrap text-foreground/70">{s.bias}</td>
                          <td className="p-2 text-xs capitalize"><span className={s.sentiment === 'positive' ? 'text-green-400' : s.sentiment === 'negative' ? 'text-red-400' : 'text-muted-foreground'}>{s.sentiment}</span></td>
                          <td className="p-2 text-[10px]">
                            {s.aiMeta ? (
                              s.aiMeta.error ? (
                                <Badge variant="outline" className="bg-destructive/20 text-destructive border border-destructive/40">AI Err</Badge>
                              ) : (
                                <Badge variant="outline" title={s.aiMeta.reasoning || ''} className="bg-muted/50 border-border text-foreground/80">
                                  {s.aiMeta.provider}{s.aiMeta.cached ? ' (cached)' : ''}
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground/60">heuristic</span>
                            )}
                          </td>
                          <td className="p-2 text-xs text-foreground/80">{s.engagement.toFixed(1)}</td>
                          <td className="p-2 text-xs">
                            <ul className="space-y-1 list-disc ml-4 text-foreground/80">
                              {s.sampleComments.slice(0,3).map((c,i) => (<li key={i} className="truncate max-w-xs" title={c}>{c}</li>))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Heuristic baseline; AI sentiment shown when provider available.</p>
              </div>
            )}
            {result && (
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
        </Card>
      )}
      {result && result.redditPosts && result.redditPosts.length > 0 && (<RedditPostsSection result={result} />)}
    </div>
  );
};

export default SubredditResults;
