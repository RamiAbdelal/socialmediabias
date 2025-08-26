import React, { useState, useMemo, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { Button, ButtonGroup, Card, CardBody, CardHeader, CardFooter, Divider, Image, Accordion, AccordionItem, Select, SelectItem } from '@heroui/react';
import  NextImage  from 'next/image';
import type { BiasScore, SignalResult, RedditPost, MBFCDetail, AnalysisResult, SubredditResultsProps, RedditSignal } from '../lib/types';
import  RedditPostsSection from './RedditPostsSection';
import RedditSignalCard from './RedditSignalCard';
import { isImageUrl, isGalleryUrl, defaultRedditSignal, getBiasColor, getConfidenceColor } from '../lib/utils';

const SubredditResults: React.FC<SubredditResultsProps> = ({ subreddit, result, error, isLoading }) => {

  const { communityName,  setCommunityName } = useAnalysis();

  // --- FILTER STATE ---
  const [biasFilter, setBiasFilter] = useState<string|null>(null);
  const [credFilter, setCredFilter] = useState<string|null>(null);
  const [factFilter, setFactFilter] = useState<string|null>(null);
  const [countryFilter, setCountryFilter] = useState<string|null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string|null>(null);
  const [sourceUrlFilter, setSourceUrlFilter] = useState<string|null>(null);

  // --- FILTER LOGIC ---
  // Combine MBFCDetail[] and RedditPost[] on the 'url' attribute, deduplicated, using defaultRedditSignal for clean merging
  const allDetails: RedditSignal[] = React.useMemo(() => {
    const details = result?.details || [];
    const redditPosts = result?.redditPosts || [];
    // Map MBFC details by URL for quick lookup
    const mbfcByUrl = new Map<string, MBFCDetail>();
    for (const d of details) {
      if (d.url) mbfcByUrl.set(d.url, d);
    }
    const combined: RedditSignal[] = [];
    // Always include all reddit posts, merging with MBFCDetail if present
    for (const p of redditPosts) {
      if (p.url) {
        const mbfc = mbfcByUrl.get(p.url);
        combined.push({ ...defaultRedditSignal, ...mbfc, ...p });
        mbfcByUrl.delete(p.url); // Remove so we don't duplicate below
      }
    }
    // Add remaining MBFC details that didn't match a reddit post
    for (const d of mbfcByUrl.values()) {
      combined.push({ ...defaultRedditSignal, ...d });
    }
    return combined;
  }, [result]);

  console.log("allDetails", allDetails);  

  const filteredDetails = useMemo(() => {
    return allDetails.filter((d) => {
      if (biasFilter && d.bias !== biasFilter) return false;
      if (credFilter && d.credibility !== credFilter) return false;
      if (factFilter && d.factual_reporting !== factFilter) return false;
      if (countryFilter && d.country !== countryFilter) return false;
      if (mediaTypeFilter && d.media_type !== mediaTypeFilter) return false;
      if (sourceUrlFilter && d.source_url !== sourceUrlFilter) return false;
      return true;
    });
  }, [allDetails, biasFilter, credFilter, factFilter, countryFilter, mediaTypeFilter, sourceUrlFilter]);


  console.log("filteredDetails", filteredDetails);  

  // --- FILTER OPTIONS (never undefined) ---
  const biasOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.bias).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const credOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.credibility).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const factOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.factual_reporting).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const countryOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.country).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const mediaTypeOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.media_type).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const sourceUrlOptions = useMemo(() => {
    const urls = Array.from(new Set(allDetails.map(d => d.source_url).filter((v): v is string => typeof v === 'string' && v !== '')));
    return urls.map(url => ({
      key: url,
      label: url,
      count: allDetails.filter(d => d.source_url === url).length
    }));
  }, [allDetails]);

  // --- FILTER BUTTON COMPONENT ---
  const FilterButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    
      <Button
        variant='solid'
        className={`text-xs dark:bg-neutral-800 border-r border-white/10 text-white/90 transition-all shadow-sm hover:shadow-lg
          ${active ? 'dark:bg-neutral-200 text-gray-900' : ''}`}
        onClick={onClick}
        type="button"
      >
        {label}
      </Button>
    
  );

  // --- CLEAR FILTERS BUTTON ---
  const anyFilter = biasFilter || credFilter || factFilter || countryFilter || mediaTypeFilter;

  // Utility to fetch OG:image from a URL
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/og-image?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.ogImage || null;
  } catch {
    return null;
  }
}
  // --- OG IMAGE STATE ---
  const [ogImages, setOgImages] = useState<{ [url: string]: string | null }>({});

  useEffect(() => {
    // Only fetch for allDetails that are not images/galleries and not already fetched
    const urlsToFetch = allDetails
      .filter((d: RedditSignal) => d.url && !isImageUrl(d.url) && !isGalleryUrl(d.url) && !(d.url in ogImages))
      .map((d: RedditSignal) => d.url as string);
      
    if (urlsToFetch.length === 0) return;
    urlsToFetch.forEach(async (url: string) => {
      // Mark as loading to prevent duplicate fetches
      setOgImages(prev => ({ ...prev, [url]: null }));
      const og = await fetchOgImage(url);
      // Always set, even if null, so we don't retry failed URLs
      setOgImages(prev => ({ ...prev, [url]: og }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDetails]);

  // Utility to check if a permalink is a Reddit comment URL
function isRedditCommentPermalink(permalink: string) {
  // Reddit comment permalinks are like /r/sub/comments/postid/title/commentid/
  // "/r/centrist/comments/1meje71/i_deeply_regret_my_vote_for_trump/"
  // They have at least 6 segments when split by '/'
  if (!permalink) return false;
  const parts = permalink.split('/').filter(Boolean);
  return parts.length >= 4 && parts[0] === 'r' && parts[2] === 'comments';
}

// Utility to fetch a Reddit comment body from a permalink (calls backend API to avoid CORS)
async function fetchRedditCommentBody(permalink: string): Promise<string|null> {
  try {
    const res = await fetch(`/api/reddit-comment?permalink=${encodeURIComponent(permalink)}`);
    console.log("Fetching Reddit Comment Body", permalink, res)
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

  // --- REDDIT COMMENT STATE ---
  const [commentBodies, setCommentBodies] = useState<{ [permalink: string]: string|null }>({});

  // Remove auto-fetching of all comments. We'll fetch per-listing on demand.


  // Log commentBodies state whenever it changes
  useEffect(() => {
    console.log('Current commentBodies state:', commentBodies);
  }, [commentBodies]);

  return (
    <div className="mb-8">
      {error && (
        <div className="bg-gradient-to-r from-red-700 via-yellow-700 to-yellow-500 border border-yellow-400/40 rounded-lg p-4 mb-8 text-yellow-100 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">Analysis Error</h3>
              <div className="mt-2 text-sm text-yellow-100">{error}</div>
            </div>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="text-yellow-200 text-lg mb-8">Analyzing {communityName}...</div>
      )}
      {result && result.overallScore && (
        <Card>
              
          <CardHeader className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <h2 className="text-center text-2xl font-semibold bg-gradient-to-r">r/{subreddit}</h2>
          </CardHeader>
          <Divider className='opacity-50'/>
          

          {/* Overall Bias Score & Confidence */}
          <CardBody className="p-6 pb-0">  
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="dark:bg-neutral-800 rounded-lg shadow-xl p-4">
                <h3 className="text-lg font-medium mb-2">Overall Bias Score</h3>
                <div className={`text-4xl font-bold ${getBiasColor(result.overallScore.score)} bg-gradient-to-r from-blue-400 via-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
                  {result.overallScore.score.toFixed(1)}/10
                </div>
                <div className="capitalize">{result.overallScore.label}</div>
              </div>
              <div className="dark:bg-neutral-800 rounded-lg shadow-xl p-4">
                <h3 className="text-lg font-medium mb-2">Confidence</h3>
                <div className={`text-3xl font-semibold ${getConfidenceColor(result.overallScore.confidence)} bg-gradient-to-r from-green-400 via-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
                  {Math.round(result.overallScore.confidence * 100)}%
                </div>
                <div className="text-yellow-300">Analysis confidence</div>
              </div>
            </div>
          </CardBody>

          {/* Bias Breakdown & Filters in Accordion */}
          <CardBody className="px-6 py-0">
            {(result.biasBreakdown || credOptions.length > 0 || factOptions.length > 0 || countryOptions.length > 0 || mediaTypeOptions.length > 0) && (
              <Accordion defaultExpandedKeys={["1"]} className="w-full mb-4 overflow-y-hidden">
                <AccordionItem key="1" value="filters" title={<h3 className="text-lg font-medium cursor-pointer">Filters</h3>} className="w-full">
                  <div className="flex flex-row items-start flex-wrap">
                    {/* Source URL Filter */}
                    <div className="mb-4 mr-4 min-w-[300px]">
                      <div className="font-semibold text-sm mb-2">Source URL</div>
                      <Select
                        items={sourceUrlOptions}
                        showScrollIndicators={true}
                        placeholder="Select Source URL"
                        selectedKeys={sourceUrlFilter ? [sourceUrlFilter] : []}
                        onSelectionChange={keys => {
                          const val = Array.from(keys)[0] as string | undefined;
                          setSourceUrlFilter(val || null);
                        }}
                        className="w-full text-xs"
                        isClearable
                      >
                        {(item) => (
                          <SelectItem key={item.key} textValue={item.label}>
                            <div className="flex justify-between items-center w-full">
                              <span>{item.label}</span>
                              <span className="text-xs text-gray-400 ml-2">{item.count}</span>
                            </div>
                          </SelectItem>
                        )}
                      </Select>
                    </div>
                    {/* Bias Filters */}
                    <div className="mb-4 mr-4">
                      <div className="font-semibold text-sm mb-2">Bias</div>
                      <ButtonGroup className="flex flex-wrap items-start justify-start">
                        {result.biasBreakdown && Object.entries(result.biasBreakdown).map(([bias, count]) => (
                          <FilterButton
                            key={bias}
                            label={`${bias} (${count})`}
                            active={biasFilter === bias}
                            onClick={() => setBiasFilter(biasFilter === bias ? null : bias)}
                          />
                        ))}
                      </ButtonGroup>
                    </div>
                    {/* Credibility Filters */}
                    <div className="mb-4 mr-4">
                      <div className="font-semibold text-sm mb-2">Credibility</div>
                      <ButtonGroup className="flex flex-wrap items-start justify-start">
                        {credOptions.map(cred => {
                          const count = allDetails.filter(d => d.credibility === cred).length;
                          return (
                            <FilterButton
                              key={cred}
                              label={`${cred} (${count})`}
                              active={credFilter === cred}
                              onClick={() => setCredFilter(credFilter === cred ? null : (cred || ''))}
                            />
                          );
                        })}
                      </ButtonGroup>
                    </div>
                    {/* Factual Reporting Filters */}
                    <div className="mb-4 mr-4">
                      <div className="font-semibold text-sm mb-2">Factual Reporting</div>
                      <ButtonGroup className="flex flex-wrap items-start justify-start">
                        {factOptions.map(fact => {
                          const count = allDetails.filter(d => d.factual_reporting === fact).length;
                          return (
                            <FilterButton
                              key={fact}
                              label={`${fact} (${count})`}
                              active={factFilter === fact}
                              onClick={() => setFactFilter(factFilter === fact ? null : (fact || ''))}
                            />
                          );
                        })}
                      </ButtonGroup>
                    </div>
                    {/* Country Filters */}
                    <div className="mb-4 mr-4">
                      <div className="font-semibold text-sm mb-2">Country</div>
                      <ButtonGroup className="flex flex-wrap items-start justify-start">
                        {countryOptions.map(country => {
                          const count = allDetails.filter(d => d.country === country).length;
                          return (
                            <FilterButton
                              key={country}
                              label={`${country} (${count})`}
                              active={countryFilter === country}
                              onClick={() => setCountryFilter(countryFilter === country ? null : (country || ''))}
                            />
                          );
                        })}
                      </ButtonGroup>
                    </div>
                    {/* Media Type Filters */}
                    <div className="mb-4 mr-4">
                      <div className="font-semibold text-sm mb-2">Media Type</div>
                      <ButtonGroup className="flex flex-wrap items-start justify-start">
                        {mediaTypeOptions.map(mt => {
                          const count = allDetails.filter(d => d.media_type === mt).length;
                          return (
                            <FilterButton
                              key={mt}
                              label={`${mt} (${count})`}
                              active={mediaTypeFilter === mt}
                              onClick={() => setMediaTypeFilter(mediaTypeFilter === mt ? null : (mt || ''))}
                            />
                          );
                        })}
                      </ButtonGroup>
                    </div>
                  </div>
                  {(anyFilter || sourceUrlFilter) && (
                    <button
                      className="mt-2 px-4 py-1 rounded-full bg-yellow-400 text-emerald-900 font-bold text-xs border border-yellow-400 shadow hover:bg-yellow-300 transition"
                      onClick={() => {
                        setBiasFilter(null); setCredFilter(null); setFactFilter(null); setCountryFilter(null); setMediaTypeFilter(null); setSourceUrlFilter(null);
                      }}
                      type="button"
                    >
                      Clear All Filters
                    </button>
                  )}
                </AccordionItem>
              </Accordion>
            )}
          </CardBody>
          <Divider className='opacity-50'/>
            {/* MBFCResults Card List (filtered) */}
            {filteredDetails.length > 0 && (
              <CardBody className="p-6">
                {/* <h3 className="text-lg font-medium mb-4">MBFC Results</h3> */}
                <div className="grid grid-cols-1 gap-4">
                  {filteredDetails.map((d: RedditSignal, i: number) => (
                    <RedditSignalCard
                      key={i}
                      d={d}
                      ogImages={ogImages}
                      commentBodies={commentBodies}
                      setCommentBodies={setCommentBodies}
                      fetchRedditCommentBody={fetchRedditCommentBody}
                      isRedditCommentPermalink={isRedditCommentPermalink}
                    />
                  ))}
                </div>
              </CardBody>
            )}
            {/* Meta Info */}
            <div className="text-sm flex flex-wrap gap-4 mt-4">
              <span>Analyzed: <span className="font-semibold">{result.communityName}</span> on <span className="font-semibold">{result.platform}</span></span>
              {result.analysisDate && <span>Date: {new Date(result.analysisDate).toLocaleString()}</span>}
              {typeof result.totalPosts === 'number' && <span>Total Posts: {result.totalPosts}</span>}
              {typeof result.urlsChecked === 'number' && <span>URLs Checked: {result.urlsChecked}</span>}
            </div>
            
          
        </Card>

      )}

      {/* Always show Reddit post data if available */}
      {result && result.redditPosts && result.redditPosts.length > 0 && (
        <RedditPostsSection result={result} />
      )}
      </div>

  );
  
};

export default SubredditResults;
