

"use client";
import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


type Subreddit = { name: string; url: string };
interface MenuProps {
  popularSubreddits: Subreddit[];
}

const Menu: React.FC<MenuProps> = ({ popularSubreddits }) => {
  const { communityName, setCommunityName, isLoading, analyzeCommunity } = useAnalysis();
  const router = useRouter();
  return (
    <Card className="menu p-6 mb-8 backdrop-blur-sm bg-card/70 border border-border/60 shadow-sm">
      <div className="main-input flex flex-col md:flex-row gap-4 mb-4">
        <Input
          type="text"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="Enter subreddit URL (e.g., https://www.reddit.com/r/politics/)"
          onKeyDown={(e) => e.key === 'Enter' && analyzeCommunity(communityName)}
        />
        <Button
          disabled={isLoading || !communityName.trim()}
          onClick={() => analyzeCommunity(communityName)}
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
