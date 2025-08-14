'use client';


import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Menu from '../components/Menu';
import SubredditResults from './reddit/r/[subreddit]/SubredditResults';

// 20 popular subreddits for quick analysis
const popularSubreddits = [
  { name: 'r/nottheonion', url: 'https://www.reddit.com/r/nottheonion' },
  { name: 'r/worldnews', url: 'https://www.reddit.com/r/worldnews' },
  { name: 'r/politics', url: 'https://www.reddit.com/r/politics' },
  { name: 'r/LateStageCapitalism', url: 'https://www.reddit.com/r/LateStageCapitalism' },
  { name: 'r/Conservative', url: 'https://www.reddit.com/r/Conservative' },
  { name: 'r/PoliticalHumor', url: 'https://www.reddit.com/r/PoliticalHumor' },
  { name: 'r/AskReddit', url: 'https://www.reddit.com/r/AskReddit' },
  { name: 'r/WhitePeopleTwitter', url: 'https://www.reddit.com/r/WhitePeopleTwitter' },
  { name: 'r/Conspiracy', url: 'https://www.reddit.com/r/conspiracy' },
  { name: 'r/news', url: 'https://www.reddit.com/r/news' },
  { name: 'r/ukpolitics', url: 'https://www.reddit.com/r/ukpolitics' },
  { name: 'r/PoliticalCompassMemes', url: 'https://www.reddit.com/r/PoliticalCompassMemes' },
  { name: 'r/TwoXChromosomes', url: 'https://www.reddit.com/r/TwoXChromosomes' },
  { name: 'r/BlackPeopleTwitter', url: 'https://www.reddit.com/r/BlackPeopleTwitter' },
  { name: 'r/atheism', url: 'https://www.reddit.com/r/atheism' },
  { name: 'r/ConservativeMemes', url: 'https://www.reddit.com/r/ConservativeMemes' },
  { name: 'r/Libertarian', url: 'https://www.reddit.com/r/Libertarian' },
  { name: 'r/Britain', url: 'https://www.reddit.com/r/Britain' },
  { name: 'r/centrist', url: 'https://www.reddit.com/r/centrist' },
  { name: 'r/PoliticalDiscussion', url: 'https://www.reddit.com/r/PoliticalDiscussion' },
];

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

export default function Home() {
  const [communityName, setCommunityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pathname, setPathname] = useState('');

  // Minimal router type for Menu
  const router = { push: (url: string) => { window.location.href = url; } };

  useEffect(() => {
    setPathname(window.location.pathname);
    const handleRouteChange = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/reddit\/r\/([^/]+)/);
    if (match && match[1]) {
      const subreddit = match[1];
      const url = `https://www.reddit.com/r/${subreddit}`;
      setCommunityName(url);
      analyzeCommunity(url);
    }
  }, [pathname]);

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

  const isSubredditPage = /^\/reddit\/r\/[^/]+/.test(pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col min-h-screen">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <Header />
        <Menu
          communityName={communityName}
          setCommunityName={setCommunityName}
          isLoading={isLoading}
          analyzeCommunity={analyzeCommunity}
          popularSubreddits={popularSubreddits}
          router={router}
        />
        {error && (
          <div className="error bg-gradient-to-r from-red-700 via-yellow-700 to-yellow-500 border border-yellow-400/40 rounded-lg p-4 mb-8 text-yellow-100 shadow-lg">
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
      </div>
      {/* SubredditResults always at the bottom if on subreddit page */}
      {isSubredditPage && result && (
        <div className="max-w-4xl mx-auto w-full pb-8">
          <SubredditResults result={result} error={error} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
