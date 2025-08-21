
"use client";

import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, CardFooter, Avatar, Button } from '@heroui/react';


type Subreddit = { name: string; url: string };
interface MenuProps {
  popularSubreddits: Subreddit[];
}

const Menu: React.FC<MenuProps> = ({ popularSubreddits }) => {
  const { communityName, setCommunityName, isLoading, analyzeCommunity } = useAnalysis();
  const router = useRouter();
  return (
    <div className="menu bg-gradient-to-br from-green-900/70 via-gray-900/80 to-yellow-800/40 shadow-xl rounded-2xl p-6 mb-8 border border-yellow-400/20 backdrop-blur-md">

      <div className="flex w-full flex-wrap md:flex-nowrap gap-4">

      </div>
      
      <div className="main-input flex gap-4 mb-4">
        <input
          type="text"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="Enter subreddit URL (e.g., https://www.reddit.com/r/politics/)"
          className="flex-1 px-4 py-2 bg-emerald-950/80 border border-yellow-400/20 rounded-md text-yellow-100 placeholder:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
          onKeyPress={(e) => e.key === 'Enter' && analyzeCommunity(communityName)}
        />
        <button
          onClick={() => analyzeCommunity(communityName)}
          disabled={isLoading || !communityName.trim()}
          className="px-6 py-2 bg-gradient-to-r from-green-400 via-yellow-300 to-yellow-500 text-gray-900 font-bold rounded-md shadow hover:from-green-500 hover:to-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      <div className="links flex flex-wrap gap-2">
        {popularSubreddits.map((sub: Subreddit) => {
          const match = sub.url.match(/\/r\/([^/]+)/i);
          const subredditSlug = match ? match[1].toLowerCase() : '';
          return (
            <button
              key={sub.name}
              type="button"
              onClick={() => router.push(`/reddit/r/${subredditSlug}`)}
              className="px-3 py-1 rounded-full bg-gray-900 text-yellow-200 text-xs font-semibold border-2 border-yellow-700/40 hover:bg-gray-800 hover:border-yellow-400/60 transition focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
              style={{ minWidth: 'fit-content' }}
            >
              {sub.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Menu;
