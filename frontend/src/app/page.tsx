// frontend/src/app/page.tsx
"use client";

import { useAnalysis } from "../context/AnalysisContext";
import SubredditResults from "../components/SubredditResults";

export default function HomePage() {
  const { result, error, isLoading } = useAnalysis();

  return (
    <main>
      {isLoading && <p className="text-gray-400">Analyzing subreddit...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {/* {result && <SubredditResults subreddit={} result={result} error={error} isLoading={isLoading} />} */}
    </main>
  );
}
