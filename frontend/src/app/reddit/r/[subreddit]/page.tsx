"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SubredditResults from './SubredditResults';

export default function SubredditPage() {
  const params = useParams();
  const subreddit = params?.subreddit as string;
  interface BiasScore {
    score: number;
    confidence: number;
    label: string;
  }
  interface SignalResult {
    signalType: string;
    score: BiasScore;
    summary: string;
    examples: string[];
  }
  interface RedditPost {
    title: string;
    url: string;
    permalink: string;
    author: string;
    score: number;
  }
  interface AnalysisResult {
    communityName?: string;
    platform?: string;
    overallScore?: BiasScore;
    signalResults?: SignalResult[];
    analysisDate?: string;
    redditPosts?: RedditPost[];
    message?: string;
  }
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (subreddit) {
      analyzeCommunity(`https://www.reddit.com/r/${subreddit}`);
    }
    // eslint-disable-next-line
  }, [subreddit]);

  const analyzeCommunity = async (url: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`http://localhost:9006/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redditUrl: url })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  return <SubredditResults result={result} error={error} isLoading={isLoading} />;
}
