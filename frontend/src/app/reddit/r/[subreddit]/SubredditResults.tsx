import React from 'react';

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

interface SubredditResultsProps {
  result: AnalysisResult | null;
  error: string | null;
  isLoading: boolean;
}

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

const isImageUrl = (url: string) => {
  return /\.(jpe?g|png|gif|bmp|webp|avif)$/i.test(url) || url.includes('i.redd.it/');
};

const isGalleryUrl = (url: string) => {
  return url.includes('reddit.com/gallery/');
};

const SubredditResults: React.FC<SubredditResultsProps> = ({ result, error, isLoading }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8" />
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
        <div className="bg-gradient-to-br from-green-900/80 via-emerald-900/80 to-yellow-700/80 shadow-lg rounded-2xl p-6 border border-yellow-400/30">
          <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-green-400 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">Analysis Results</h2>
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
          {result.signalResults && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 text-yellow-200">Signal Breakdown</h3>
              <div className="space-y-4">
                {result.signalResults.map((signal, index) => (
                  <div key={index} className="border border-yellow-400/20 rounded-lg p-4 bg-emerald-950/60">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-yellow-100">{signal.signalType}</h4>
                      <div className={`text-lg font-semibold ${getBiasColor(signal.score.score)} bg-gradient-to-r from-green-400 via-yellow-400 to-yellow-600 bg-clip-text text-transparent`}>
                        {signal.score.score.toFixed(1)}/10
                      </div>
                    </div>
                    <p className="text-yellow-300 text-sm mb-2">{signal.summary}</p>
                    {signal.examples.length > 0 && (
                      <div className="text-sm text-yellow-200">
                        <span className="font-medium">Examples:</span> {signal.examples.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-sm text-yellow-200">
            Analyzed: {result.communityName} on {result.platform}
            {result.analysisDate ? ` • ${new Date(result.analysisDate).toLocaleString()}` : ''}
          </div>
        </div>
      )}
      {result && !result.overallScore && result.redditPosts && (
        <div className="bg-gradient-to-br from-green-900/70 via-gray-900/80 to-yellow-800/40 shadow-lg rounded-2xl p-6 border border-yellow-400/20">
          <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-green-300 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">Reddit Posts</h2>
          <div className="mb-4 text-yellow-200">No MBFC bias data found. Showing real Reddit post data only.</div>
          <ul className="divide-y divide-yellow-400/10">
            {result.redditPosts.map((post: RedditPost, idx: number) => {
              const url = post.url;
              const isImage = isImageUrl(url);
              const isGallery = isGalleryUrl(url);
              return (
                <li key={idx} className="py-4">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-yellow-200 font-medium hover:underline">
                    {post.title}
                  </a>
                  <div className="text-sm text-yellow-300">by {post.author} | Score: {post.score}</div>
                  <div className="text-xs text-yellow-400 break-all mb-2">{url}</div>
                  {isImage && (
                    <div className="my-2">
                      <img
                        src={url}
                        alt={post.title}
                        className="rounded-lg max-h-80 w-auto border border-yellow-400/10 shadow-md mx-auto"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {isGallery && (
                    <div className="my-2 text-emerald-300 text-xs italic">
                      [Reddit gallery post: <a href={url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SubredditResults;
