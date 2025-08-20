

"use client";
import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';
import { useRouter } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';


type Subreddit = { name: string; url: string };
interface MenuProps {
  popularSubreddits: Subreddit[];
}

const Menu: React.FC<MenuProps> = ({ popularSubreddits }) => {
  const { communityName, setCommunityName, isLoading, analyzeCommunity } = useAnalysis();
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <div className={`menu ${colors.card} ${colors.border} ${colors.shadow} rounded-2xl p-6 mb-8`}>
      <div className="main-input flex gap-4 mb-4">
        <input
          type="text"
          value={communityName}
          onChange={(e) => setCommunityName(e.target.value)}
          placeholder="Enter subreddit URL (e.g., https://www.reddit.com/r/politics/)"
          className={`flex-1 px-4 py-2 ${colors.background} ${colors.border} rounded-md ${colors.foreground} placeholder:${colors.muted} focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition`}
          onKeyPress={(e) => e.key === 'Enter' && analyzeCommunity(communityName)}
        />
        <button
          onClick={() => analyzeCommunity(communityName)}
          disabled={isLoading || !communityName.trim()}
          className={`px-6 py-2 ${colors.button} font-bold rounded-md ${colors.shadow} transition disabled:opacity-50 disabled:cursor-not-allowed`}
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
              className={`px-3 py-1 rounded-full ${colors.background} ${colors.accent} text-xs font-semibold ${colors.border} border-2 hover:opacity-80 transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${colors.shadow}`}
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
