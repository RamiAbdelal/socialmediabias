// frontend/src/app/page.tsx
"use client";

import { useAnalysis } from "../context/AnalysisContext";
import { StatusMessage } from "../components/StatusMessage";

export default function HomePage() {

  const { error, isLoading, communityName, phase, discussionProgress } = useAnalysis();

  return (
    <main>
      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
