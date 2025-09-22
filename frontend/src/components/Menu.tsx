

"use client";
import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { extractSubreddit, formatSubreddit } from '@/lib/utils';


type Subreddit = { name: string; url: string };
interface MenuProps {
  popularSubreddits: Subreddit[];
}

const Menu: React.FC<MenuProps> = ({ popularSubreddits }) => {
  const { communityName, setCommunityName, isLoading, analyzeCommunity } = useAnalysis();
  const router = useRouter();
  return (
    <Card className="menu z-50 p-6 mb-8 backdrop-blur-sm bg-card/70 border border-border/60 shadow-sm">
      <div className="main-input flex flex-col md:flex-row gap-4 mb-4">
        <AutocompleteInput
          value={communityName}
          onChange={(v) => setCommunityName(v)}
          placeholder="Type a subreddit or paste a Reddit URL"
          onSelect={(s) => {
            const name = formatSubreddit(s.name);
            setCommunityName(name);
            analyzeCommunity(`https://www.reddit.com/${name}`);
          }}
        />
        <Button
          disabled={isLoading || !communityName.trim()}
          onClick={() => {
            const name = extractSubreddit(communityName);
            if (!name) return;
            analyzeCommunity(`https://www.reddit.com/${name}`);
          }}
          className="md:min-w-[180px]"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>
  <div className="links flex flex-wrap gap-2">
        {popularSubreddits.map((sub: Subreddit) => {
          const match = sub.url.match(/\/r\/([^/]+)/i);
          const subredditSlug = match ? match[1].toLowerCase() : '';
          return (
            <Button
              key={sub.name}
              type="button"
              variant="subtle"
              size="pill"
              onClick={() => router.push(`/reddit/r/${subredditSlug}`)}
              className="px-3 bg-secondary/40 hover:bg-secondary/60 text-secondary-foreground/90"
            >
              {sub.name}
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

export default Menu;
