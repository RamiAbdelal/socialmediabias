// frontend/src/app/reddit/r/[subreddit]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAnalysis } from "../../../../context/AnalysisContext";
import SubredditResults from "../../../../components/SubredditResults";

export default function SubredditPage() {
  const { subreddit } = useParams();
  const { analyzeCommunity, result, error, isLoading } = useAnalysis();

  useEffect(() => {
    if (subreddit) {
      analyzeCommunity(`https://reddit.com/r/${subreddit}`);
    }
  }, [subreddit]);

  return (
    <main>
      {isLoading && <p className="text-gray-400">Analyzing r/{subreddit}...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {result && <SubredditResults result={result} error={error} isLoading={isLoading} />}
    </main>
  );
}
