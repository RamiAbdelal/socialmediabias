export interface BiasScore {
  score: number;
  confidence: number;
  label: string;
}

export interface SignalResult {
  signalType: string;
  score: BiasScore;
  summary: string;
  examples: string[];
}

export interface RedditPost {
  title: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
}

export interface MBFCDetail {
  url: string;
  bias?: string;
  country?: string;
  credibility?: string;
  factual_reporting?: string;
  id?: number;
  mbfc_url?: string;
  media_type?: string;
  source_id?: number;
  source_name?: string;
  source_url?: string;
  created_at?: string;
}

export type RedditSignal = {
  url: string;
  // MBFCDetail fields
  bias?: string;
  country?: string;
  credibility?: string;
  factual_reporting?: string;
  id?: number;
  mbfc_url?: string;
  media_type?: string;
  source_id?: number;
  source_name?: string;
  source_url?: string;
  created_at?: string;
  // RedditPost fields
  title?: string;
  permalink?: string;
  author?: string;
  score?: number;
}

export interface AnalysisResult {
  communityName?: string;
  platform?: string;
  overallScore?: BiasScore;
  signalResults?: SignalResult[];
  analysisDate?: string;
  redditPosts?: RedditPost[];
  message?: string;
  biasBreakdown?: Record<string, number>;
  details?: MBFCDetail[];
  totalPosts?: number;
  urlsChecked?: number;
}

export interface SubredditResultsProps {
  result: AnalysisResult | null;
  error: string | null;
  isLoading: boolean;
}
