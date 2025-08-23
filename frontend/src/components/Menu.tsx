
"use client";

import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardFooter, Avatar, Button, Input } from '@heroui/react';


type Subreddit = { name: string; url: string };
interface MenuProps {
  popularSubreddits: Subreddit[];
}

const Menu: React.FC<MenuProps> = ({ popularSubreddits }) => {
  const { communityName, setCommunityName, isLoading, analyzeCommunity } = useAnalysis();
  const router = useRouter();
  return (
    <Card className="menu shadow-xl p-6 mb-8 backdrop-blur-md">

      <div className="flex w-full flex-wrap md:flex-nowrap gap-4">

      </div>
      
      <div className="main-input flex gap-4 mb-4">
        <Input
          type="text"
          variant="flat"
          size="lg"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="Enter subreddit URL (e.g., https://www.reddit.com/r/politics/)"
          onKeyPress={(e) => e.key === 'Enter' && analyzeCommunity(communityName)}
        />
        <Button
          variant="flat"
          size="lg"
          onChange={() => analyzeCommunity(communityName)}
          isLoading={isLoading}
          disabled={isLoading || !communityName.trim()}
          className="min-w-[200] bg-gradient-to-tr from-sky-400 to-blue-800 text-white rounded-md shadow-xl hover:from-green-500 hover:to-yellow-400 transition disabled:opacity-50"
        >
          {isLoading ? '' : 'Analyse'}
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
              variant="flat"
              onClick={() => router.push(`/reddit/r/${subredditSlug}`)}
              className="px-3 py-1 rounded-full hover:bg-gray-700"
              style={{ minWidth: 'fit-content' }}
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
