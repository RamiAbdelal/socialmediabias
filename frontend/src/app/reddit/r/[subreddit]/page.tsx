// frontend/src/app/reddit/r/[subreddit]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAnalysis } from "../../../../context/AnalysisContext";
import SubredditResults from "../../../../components/SubredditResults";
import { StatusMessage } from "../../../../components/StatusMessage";

export default function SubredditPage() {
  const subreddit = (useParams() as { subreddit: string }).subreddit;
  const { analyzeCommunity, result, error, isLoading, phase, discussionProgress, communityName } = useAnalysis();

  useEffect(() => {
    if (subreddit) {
      analyzeCommunity(`https://reddit.com/r/${subreddit}`);
    }
  }, [subreddit, analyzeCommunity]);

  return (
    <main>
      <SubredditResults subreddit={subreddit} result={result} error={error} isLoading={isLoading} />
    </main>
  );
}
