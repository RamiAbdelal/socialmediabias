// frontend/src/context/AnalysisContext.tsx
"use client";
import { createContext, useContext, useState } from "react";



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
export interface AnalysisResult {
  communityName?: string;
  platform?: string;
  overallScore?: BiasScore;
  signalResults?: SignalResult[];
  analysisDate?: string;
  redditPosts?: RedditPost[];
  message?: string;
}

interface AnalysisContextType {
  result: AnalysisResult | null;
  error: string | null;
  isLoading: boolean;
  analyzeCommunity: (url: string) => Promise<void>;
  communityName: string;
  setCommunityName: (name: string) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);


import { ReactNode } from "react";


export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [communityName, setCommunityName] = useState('');

  const analyzeCommunity = async (url: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`http://localhost:9006/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redditUrl: url }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const logged = await res.json();
      setResult(logged);
      console.log(logged); // Log the result for debugging
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnalysisContext.Provider value={{ result, error, isLoading, analyzeCommunity, communityName, setCommunityName }}>
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
