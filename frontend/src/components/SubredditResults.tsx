import React, { useState, useMemo } from 'react';
import { Button, ButtonGroup, Card, CardBody, CardHeader, CardFooter, Divider } from '@heroui/react';

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
import Image from 'next/image';

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

const SubredditResults: React.FC<SubredditResultsProps> = ({ result, error, isLoading }) => {
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
        className={`font-semibold text-xs transition-all shadow-sm 
          ${active ? 'bg-yellow-400 text-gray-900 border-yellow-400' : 'bg-gray-950/50 hover:bg-blue-700/30 hover:text-slate-100'}`}
        onClick={onClick}
        type="button"
      >
        {label}
      </Button>
    
  );

  // --- CLEAR FILTERS BUTTON ---
  const anyFilter = biasFilter || credFilter || factFilter || countryFilter || mediaTypeFilter;

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
              <h3 className="text-sm font-medium text-yellow-200">Analysis Error</h3>
              <div className="mt-2 text-sm text-yellow-100">{error}</div>
            </div>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="text-yellow-200 text-lg mb-8">Analyzing subreddit...</div>
      )}
      {result && result.overallScore && (
        <Card className="p-0">
              
          <CardHeader className="p-6">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-500 to-violet-300 bg-clip-text text-transparent">Analysis Results</h2>

          </CardHeader>
          <Divider className="mb-4" />
          <CardBody >

            {/* Overall Bias Score & Confidence */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-emerald-950/80 rounded-lg p-4 border border-yellow-400/20">
                <h3 className="text-lg font-medium mb-2 text-yellow-200">Overall Bias Score</h3>
                <div className={`text-4xl font-bold ${getBiasColor(result.overallScore.score)} bg-gradient-to-r from-green-400 via-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
                  {result.overallScore.score.toFixed(1)}/10
                </div>
                <div className="text-yellow-300 capitalize">{result.overallScore.label}</div>
              </div>
              <div className="bg-emerald-950/80 rounded-lg p-4 border border-yellow-400/20">
                <h3 className="text-lg font-medium mb-2 text-yellow-200">Confidence</h3>
                <div className={`text-3xl font-semibold ${getConfidenceColor(result.overallScore.confidence)} bg-gradient-to-r from-green-400 via-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
                  {Math.round(result.overallScore.confidence * 100)}%
                </div>
                <div className="text-yellow-300">Analysis confidence</div>
              </div>
            </div>
            {/* Bias Breakdown & Filters */}
            {(result.biasBreakdown || credOptions.length > 0 || factOptions.length > 0 || countryOptions.length > 0 || mediaTypeOptions.length > 0) && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 text-yellow-200">Filter MBFC Results</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {/* Bias Filters */}
                  {result.biasBreakdown && Object.entries(result.biasBreakdown).map(([bias, count]) => (
                    <FilterButton
                      key={bias}
                      label={`${bias} (${count})`}
                      active={biasFilter === bias}
                      onClick={() => setBiasFilter(biasFilter === bias ? null : bias)}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {/* Credibility Filters */}
                  {credOptions.map(cred => (
                    <FilterButton
                      key={cred}
                      label={`Credibility: ${cred}`}
                      active={credFilter === cred}
                      onClick={() => setCredFilter(credFilter === cred ? null : (cred || ''))}
                    />
                  ))}
                  {/* Factual Reporting Filters */}
                  {factOptions.map(fact => (
                    <FilterButton
                      key={fact}
                      label={`Factual: ${fact}`}
                      active={factFilter === fact}
                      onClick={() => setFactFilter(factFilter === fact ? null : (fact || ''))}
                    />
                  ))}
                </div>

                  {/* Country Filters */}
                  <ButtonGroup className="flex flex-wrap gap-2 mb-2">
                    {countryOptions.map(country => (
                      <FilterButton
                        key={country}
                        label={`Country: ${country}`}
                        active={countryFilter === country}
                        onClick={() => setCountryFilter(countryFilter === country ? null : (country || ''))}
                      />
                    ))}
                  </ButtonGroup>
                  {/* Media Type Filters */}
                  <ButtonGroup className="flex flex-wrap mb-2">
                    {mediaTypeOptions.map(mt => (
                      <FilterButton
                        key={mt}
                        label={`Media: ${mt}`}
                        active={mediaTypeFilter === mt}
                        onClick={() => setMediaTypeFilter(mediaTypeFilter === mt ? null : (mt || ''))}
                      />
                    ))}
                  </ButtonGroup>

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
              </div>
            )}

            {/* MBFCResults Card List (filtered) */}
            {filteredDetails.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4 text-yellow-200">MBFC Results</h3>
                <div className="grid grid-cols-1 gap-4">
                  {filteredDetails.map((d: RedditSignal, i: number) => (
                    
                    <div key={i} className="bg-emerald-950/80 border border-yellow-400/20 rounded-xl p-4 flex flex-col shadow-md">

                      <div className="flex items-center mb-2">
                        
                        {/* Bias Icon */}
                        {d.bias && <span className="mr-2">
                          {d.bias === 'Left' && <span title="Left" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-800 rounded-full" />}
                          {d.bias === 'Left-Center' && <span title="Left-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-300 to-blue-600 rounded-full" />}
                          {d.bias === 'Least Biased' && <span title="Least Biased" className="inline-block w-5 h-5 bg-gradient-to-br from-green-400 to-green-700 rounded-full" />}
                          {d.bias === 'Right-Center' && <span title="Right-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-orange-300 to-orange-600 rounded-full" />}
                          {d.bias === 'Right' && <span title="Right" className="inline-block w-5 h-5 bg-gradient-to-br from-red-400 to-red-700 rounded-full" />}
                          {d.bias === 'Questionable' && <span title="Questionable" className="inline-block w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full" />}
                          {!d.bias && <span className="inline-block w-5 h-5 bg-gray-400 rounded-full" />}
                        </span>}

                        {/* Bias Label or Reddit Title */}
                        <span className="font-bold text-yellow-100 text-lg mr-2">{d.bias || d.title }</span>

                        {d.credibility && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-yellow-800/60 text-yellow-200 text-xs font-semibold" title="Credibility">
                            Credibility: {d.credibility}
                          </span>
                        )}
                        {d.factual_reporting && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-emerald-800/60 text-emerald-200 text-xs font-semibold" title="Factual Reporting">
                            Factual Reporting: {d.factual_reporting}
                          </span>
                        )}
                      </div>

                      {/* Reddit author and score (same block/line) */}
                      <div className='flex items-center mb-2'>
                        {(d.author || typeof d.score === 'number') && (
                          <span className="text-yellow-300 text-sm">
                            {d.author && <>by {d.author}</>}
                            {d.author && typeof d.score === 'number' && ' | '}
                            {typeof d.score === 'number' && <>Score: {d.score}</>}
                          </span>
                        )}
                      </div>  

                      <div className="mb-2">
                        {isImageUrl(d.url) && (
                          <div className="my-2">
                            <Image
                              src={d.url}
                              alt={d.url}
                              width={600}
                              height={400}
                              className="rounded-lg max-h-80 w-auto border border-yellow-400/10 shadow-md mx-auto"
                              style={{ objectFit: 'contain', height: 'auto', maxHeight: '20rem' }}
                              loading="lazy"
                              unoptimized
                            />
                          </div>
                        )}
                        {isGalleryUrl(d.url) && (
                          <div className="my-2 text-emerald-300 text-xs italic">
                            [Reddit gallery post: <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
                          </div>
                        )}
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline text-yellow-200 break-all hover:text-yellow-400 text-sm">
                          {d.url}
                        </a>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-yellow-300 mb-2">
                        {d.source_name && <span title="Source Name" className="font-semibold">{d.source_name}</span>}
                        {d.media_type && <span title="Media Type">[{d.media_type}]</span>}
                        {d.country && <span title="Country">{d.country}</span>}
                        {d.source_url && <span title="Source Domain">({d.source_url})</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-yellow-400 mb-2">
                        {d.created_at && <span title="MBFC Entry Date">Added: {new Date(d.created_at).toLocaleDateString()}</span>}
                        {d.id && <span title="MBFC DB ID">ID: {d.id}</span>}
                      </div>
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
              </div>
            )}
            {/* Meta Info */}
            <div className="text-sm text-yellow-200 flex flex-wrap gap-4 mt-4">
              <span>Analyzed: <span className="font-semibold">{result.communityName}</span> on <span className="font-semibold">{result.platform}</span></span>
              {result.analysisDate && <span>Date: {new Date(result.analysisDate).toLocaleString()}</span>}
              {typeof result.totalPosts === 'number' && <span>Total Posts: {result.totalPosts}</span>}
              {typeof result.urlsChecked === 'number' && <span>URLs Checked: {result.urlsChecked}</span>}
            </div>
            
          </CardBody>
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
