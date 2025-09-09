// frontend/src/context/AnalysisContext.tsx
"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { AnalysisResult as SharedAnalysisResult } from "@/lib/types";

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
export interface AnalysisResult extends SharedAnalysisResult {
  communityName?: string;
  platform?: string;
  overallScore?: BiasScore;
  signalResults?: SignalResult[];
  analysisDate?: string;
  redditPosts?: RedditPost[];
  message?: string;
  // Extend only where needed; keep base fields from shared type
}

interface AnalysisContextType {
  result: AnalysisResult | null;
  error: string | null;
  isLoading: boolean;
  analyzeCommunity: (url: string) => Promise<void>;
  communityName: string;
  setCommunityName: (name: string) => void;
  phase?: 'idle'|'analyzing'|'digging'|'ready';
  discussionProgress?: { done: number; total: number } | null;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);


import { ReactNode } from "react";


export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [phase, setPhase] = useState<'idle'|'analyzing'|'digging'|'ready'>('idle');
  const esRef = useRef<EventSource | null>(null);
  const [discussionProgress, setDiscussionProgress] = useState<{ done: number; total: number } | null>(null);

  const analyzeCommunity = useCallback(async (url: string) => {

    if (!url.trim()) return;

    // Derive community name (subreddit) if present in URL
    const match = url.match(/reddit\.com\/(r\/[^/]+)/i);

    if (match) {
      setCommunityName(match[1]);
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setPhase('analyzing');
    setDiscussionProgress(null);

    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    try {

      const src = new EventSource(`/api/analyze/stream?redditUrl=${encodeURIComponent(url)}`);
      esRef.current = src;

      src.addEventListener('reddit', (ev: MessageEvent) => {

        const data = JSON.parse(ev.data);
        console.log('[SSE:event] reddit', data);

        setResult(prev => ({
          ...(prev || {}),
          communityName: data.subreddit,
          platform: 'reddit',
          analysisDate: new Date().toISOString(),
          redditPosts: data.redditPosts,
          totalPosts: data.totalPosts,
        }));

        setPhase('analyzing');

      });

      src.addEventListener('mbfc', (ev: MessageEvent) => {

        const data = JSON.parse(ev.data);
        console.log('[SSE:event] mbfc', data);

        setResult(prev => ({
          ...(prev || {}),
          biasBreakdown: data.biasBreakdown,
          details: data.details,
          urlsChecked: data.urlsChecked,
          overallScore: data.overallScore,
        }));

        setPhase('digging');

      });

      src.addEventListener('discussion', (ev: MessageEvent) => {

        const data = JSON.parse(ev.data);

        console.log('[SSE:event] discussion', data?.progress);

        setResult(prev => ({
          ...(prev || {}),
          discussionSignal: data.discussionSignal,
          overallScore: data.overallScore || prev?.overallScore,
        }));

        if (data.progress && typeof data.progress.done === 'number' && typeof data.progress.total === 'number') {
          setDiscussionProgress({ done: data.progress.done, total: data.progress.total });
        }
      });

      src.addEventListener('done', () => {
        console.log('[SSE:event] done');
          setPhase('ready');
          setIsLoading(false);
          setDiscussionProgress(null);
          src.close();
          esRef.current = null;
      });

      src.addEventListener('error', () => {
        console.warn('[SSE:event] error');
        setError('Analysis failed');
        setIsLoading(false);
        setPhase('idle');
        src.close();
        esRef.current = null;
      });

    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Analysis failed');
    } finally {
      // loading state finalized on done/error
    }
  }, []);

  return (
    <AnalysisContext.Provider value={{ result, error, isLoading, analyzeCommunity, communityName, setCommunityName, phase, discussionProgress }}>
      {children}
    </AnalysisContext.Provider>
  );
}


export function useAnalysis(): AnalysisContextType {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
