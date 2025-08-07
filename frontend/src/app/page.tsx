'use client';

import { useState } from 'react';

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

interface AnalysisResult {
  communityName: string;
  platform: string;
  overallScore: BiasScore;
  signalResults: SignalResult[];
  analysisDate: string;
}

export default function Home() {
  const [communityName, setCommunityName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeCommunity = async () => {
    if (!communityName.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`http://localhost:9006/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityName, platform: 'reddit' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Social Media Bias Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Analyze political bias in social media communities
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="Enter subreddit name (e.g., politics)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && analyzeCommunity()}
            />
            <button
              onClick={analyzeCommunity}
              disabled={isLoading || !communityName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">Analysis Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Overall Bias Score</h3>
                <div className={`text-4xl font-bold ${getBiasColor(result.overallScore.score)}`}>
                  {result.overallScore.score.toFixed(1)}/10
                </div>
                <div className="text-gray-600 capitalize">{result.overallScore.label}</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Confidence</h3>
                <div className={`text-3xl font-semibold ${getConfidenceColor(result.overallScore.confidence)}`}>
                  {Math.round(result.overallScore.confidence * 100)}%
                </div>
                <div className="text-gray-600">Analysis confidence</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Signal Breakdown</h3>
              <div className="space-y-4">
                {result.signalResults.map((signal, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{signal.signalType}</h4>
                      <div className={`text-lg font-semibold ${getBiasColor(signal.score.score)}`}>
                        {signal.score.score.toFixed(1)}/10
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{signal.summary}</p>
                    {signal.examples.length > 0 && (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Examples:</span> {signal.examples.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Analyzed: {result.communityName} on {result.platform} • {new Date(result.analysisDate).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
