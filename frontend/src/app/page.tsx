// frontend/src/app/page.tsx
"use client";

import { useAnalysis } from "../context/AnalysisContext";

export default function HomePage() {
  const { error, isLoading } = useAnalysis();

  return (
    <main>
      {isLoading && <p className="text-gray-400">Analysing subreddit...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
