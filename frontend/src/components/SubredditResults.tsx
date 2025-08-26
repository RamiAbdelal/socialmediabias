import React, { useState, useMemo, useEffect } from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { Button, ButtonGroup, Card, CardBody, CardHeader, CardFooter, Divider, Image, Accordion, AccordionItem } from '@heroui/react';
import  NextImage  from 'next/image';
import type { BiasScore, SignalResult, RedditPost, MBFCDetail, AnalysisResult, SubredditResultsProps, RedditSignal } from '../lib/types';
// Default RedditSignal object for clean merging
const defaultRedditSignal: RedditSignal = {
  url: '',
  bias: undefined,
  country: undefined,
  credibility: undefined,
  factual_reporting: undefined,
  id: undefined,
  mbfc_url: undefined,
  media_type: undefined,
  source_id: undefined,
  source_name: undefined,
  source_url: undefined,
  created_at: undefined,
  title: undefined,
  permalink: undefined,
  author: undefined,
  score: undefined,
};
import  RedditPostsSection from './RedditPostsSection';
import { isImageUrl, isGalleryUrl } from '../lib/utils';

const getBiasColor = (score: number) => {
  if (score <= 2) return 'text-red-600';
  if (score <= 4) return 'text-orange-600';
  if (score <= 6) return 'text-yellow-600';
  if (score <= 8) return 'text-blue-600';
  return 'text-purple-600';
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};

const SubredditResults: React.FC<SubredditResultsProps> = ({ subreddit, result, error, isLoading }) => {

  const { communityName,  setCommunityName } = useAnalysis();

  // --- FILTER STATE ---
  const [biasFilter, setBiasFilter] = useState<string|null>(null);
  const [credFilter, setCredFilter] = useState<string|null>(null);
  const [factFilter, setFactFilter] = useState<string|null>(null);
  const [countryFilter, setCountryFilter] = useState<string|null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string|null>(null);

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
      return true;
    });
  }, [allDetails, biasFilter, credFilter, factFilter, countryFilter, mediaTypeFilter]);

  console.log("filteredDetails", filteredDetails);  

  // --- FILTER OPTIONS (never undefined) ---
  const biasOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.bias).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const credOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.credibility).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const factOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.factual_reporting).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const countryOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.country).filter((v): v is string => typeof v === 'string'))), [allDetails]);
  const mediaTypeOptions = useMemo(() => Array.from(new Set(allDetails.map(d => d.media_type).filter((v): v is string => typeof v === 'string'))), [allDetails]);

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
                  {anyFilter && (
                    <button
                      className="mt-2 px-4 py-1 rounded-full bg-yellow-400 text-emerald-900 font-bold text-xs border border-yellow-400 shadow hover:bg-yellow-300 transition"
                      onClick={() => {
                        setBiasFilter(null); setCredFilter(null); setFactFilter(null); setCountryFilter(null); setMediaTypeFilter(null);
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
                    
                    <div key={i} className="bg-neutral-800 rounded-xl p-4 flex flex-col shadow-md">

                      <div className="flex flex-col items-start mb-2">
                        
                        {/* Bias Label or Reddit Title */}
                        <div className="text-blue-100 text-xl">{d.title}</div>

                        {d.bias &&
                          <div className="text-blue-100 text-lg py-3">
                            {/* Bias Icon */}
                            <span className="mr-2">
                              {d.bias === 'Left' && <span title="Left" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-800 rounded-full" />}
                              {d.bias === 'Left-Center' && <span title="Left-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-300 to-blue-600 rounded-full" />}
                              {d.bias === 'Least Biased' && <span title="Least Biased" className="inline-block w-5 h-5 bg-gradient-to-br from-green-400 to-green-700 rounded-full" />}
                              {d.bias === 'Right-Center' && <span title="Right-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-orange-300 to-orange-600 rounded-full" />}
                              {d.bias === 'Right' && <span title="Right" className="inline-block w-5 h-5 bg-gradient-to-br from-red-400 to-red-700 rounded-full" />}
                              {d.bias === 'Questionable' && <span title="Questionable" className="inline-block w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full" />}
                              {!d.bias && <span className="inline-block w-5 h-5 bg-gray-400 rounded-full" />}
                            </span>
                            {d.bias}
                          </div>
                        }
                        
                        <div className="flex gap-2 text-sm">
                          {d.credibility && (
                            <span className="px-2 py-0.5 rounded bg-yellow-800/60 text-xs font-semibold" title="Credibility">
                              Credibility: {d.credibility}
                            </span>
                          )}
                          {d.factual_reporting && (
                            <span className="px-2 py-0.5 rounded bg-emerald-800/60 text-white text-xs font-semibold" title="Factual Reporting">
                              Factual Reporting: {d.factual_reporting}
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Reddit author and score (same block/line) */}
                      <div className='flex items-center mb-2'>
                        {(d.author || typeof d.score === 'number') && (
                          <span className="text-sm">
                            {d.author && <>by {d.author}</>}
                            {d.author && typeof d.score === 'number' && ' | '}
                            {typeof d.score === 'number' && <>Score: {d.score}</>}
                          </span>
                        )}
                      </div>  

                      <div className="mr-4">
                        {isImageUrl(d.url) && (
                          <div className="my-2 flex flex-col items-center">
                            <Image
                              src={d.url}
                              alt={d.url}
                              width={600}
                              height={400}
                              className="rounded-lg max-h-80 w-auto shadow-md mx-auto"
                              style={{ objectFit: 'contain', height: 'auto' }}
                              loading="lazy"
                              // as={NextImage}
                            />
                          </div>
                        )}
                        {isGalleryUrl(d.url) && (
                          <div className="my-2 text-emerald-300 text-xs italic">
                            [Reddit gallery post: <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
                          </div>
                        )}
                        {/* OG:image preview for non-image URLs */}
                        {!isImageUrl(d.url) && !isGalleryUrl(d.url) && ogImages[d.url] && (
                          <div className="my-2 flex flex-col items-center">
                            <Image
                              src={ogImages[d.url] as string}
                              alt={d.url}
                              width={600}
                              height={400}
                              className="rounded-lg max-h-80 w-auto shadow-md mx-auto"
                              style={{ objectFit: 'contain', height: 'auto' }}
                              loading="lazy"
                              // as={NextImage}
                            />
                          </div>
                        )}
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline break-all hover:text-yellow-400 text-sm">
                          {d.url}
                        </a>
                        {d.permalink && (
                          <div className="mt-1">
                            <a
                              href={`https://reddit.com${d.permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-300 text-xs hover:text-yellow-400 break-all"
                            >
                              Reddit Permalink
                            </a>
                            {/* Show Reddit comment body if this is a comment permalink, with on-demand loading */}
                            {isRedditCommentPermalink(d.permalink) && (
                              <div className="mt-1">
                                {commentBodies[d.permalink] === undefined && (
                                  <button
                                    className="px-2 py-1 rounded bg-blue-700 text-white text-xs hover:bg-blue-600 transition border border-blue-900"
                                    onClick={async () => {
                                      setCommentBodies(prev => ({ ...prev, [d.permalink!]: null }));
                                      const body = await fetchRedditCommentBody(d.permalink!);
                                      setCommentBodies(prev => ({ ...prev, [d.permalink!]: body }));
                                    }}
                                  >
                                    Load Comment
                                  </button>
                                )}
                                {commentBodies[d.permalink] === null && (
                                  <span className="italic text-gray-400">Loading comment...</span>
                                )}
                                {typeof commentBodies[d.permalink] === 'string' && commentBodies[d.permalink] !== '' && (
                                  <div className="mt-1 bg-neutral-900 rounded p-2 text-xs text-white/90 border border-neutral-700">
                                    <span>{commentBodies[d.permalink]}</span>
                                  </div>
                                )}
                                {commentBodies[d.permalink] === '' && (
                                  <span className="italic text-red-400">Could not load comment.</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {(d.source_name || d.media_type || d.country || d.source_url) && (
                        <div className="flex flex-wrap gap-2 text-xs text-yellow-300 my-2">
                          {d.source_name && <span title="Source Name" className="font-semibold">{d.source_name}</span>}
                          {d.media_type && <span title="Media Type">[{d.media_type}]</span>}
                          {d.country && <span title="Country">{d.country}</span>}
                          {d.source_url && <span title="Source Domain">({d.source_url})</span>}
                        </div>
                      )}
                      {(d.created_at || d.id) && (
                        <div className="flex flex-wrap gap-2 text-xs text-yellow-400 mb-2">
                          {d.created_at && <span title="MBFC Entry Date">Added: {new Date(d.created_at).toLocaleDateString()}</span>}
                          {d.id && <span title="MBFC DB ID">ID: {d.id}</span>}
                        </div>
                      )}
                      {d.mbfc_url && (
                        <div className="mt-2">
                          <a href={d.mbfc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded bg-yellow-700/80 text-yellow-100 font-semibold text-xs hover:bg-yellow-600 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 21a4 4 0 005.657 0l.707-.707a4 4 0 000-5.657l-9.9-9.9a4 4 0 00-5.657 0l-.707.707a4 4 0 000 5.657l9.9 9.9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.343 17.657l1.414-1.414" /></svg>
                            MBFC Article
                          </a>
                        </div>
                      )}
                    </div>
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
