
import React from 'react';
import Image from 'next/image';
import type { RedditPost, SubredditResultsProps, AnalysisResult } from '../lib/types';
import { isImageUrl, isGalleryUrl } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface RedditPostsSectionProps {
  result: AnalysisResult | null;
}

const RedditPostsSection: React.FC<RedditPostsSectionProps> = ({ result }) => { 
  
  const { colors } = useTheme();

  return (
    <div className={`${colors.card} ${colors.border} ${colors.shadow} rounded-2xl p-6`}>
      <h2 className={`text-2xl font-semibold mb-6 ${colors.accent}`}>Reddit Posts</h2>
      {(!result?.overallScore || !result?.details) && (
        <div className={`${colors.muted} mb-4`}>No MBFC bias data found. Showing real Reddit post data only.</div>
      )}
      <ul className={`divide-y ${colors.border}`}>
        {result?.redditPosts?.map((post: RedditPost, idx: number) => {
          const url = post.url;
          const isImage = isImageUrl(url);
          const isGallery = isGalleryUrl(url);
          return (
            <li key={idx} className="py-4">
              <a href={url} target="_blank" rel="noopener noreferrer" className={`${colors.accent} font-medium hover:underline`}>
                {post.title}
              </a>
              <div className={`${colors.muted} text-sm`}>by {post.author} | Score: {post.score}</div>
              <div className={`text-xs ${colors.muted} break-all mb-2`}>{url}</div>
              {isImage && (
                <div className="my-2">
                  <Image
                    src={url}
                    alt={post.title}
                    width={600}
                    height={400}
                    className={`rounded-lg max-h-80 w-auto border ${colors.border} ${colors.shadow} mx-auto`}
                    style={{ objectFit: 'contain', height: 'auto', maxHeight: '20rem' }}
                    loading="lazy"
                    unoptimized
                  />
                </div>
              )}
              {isGallery && (
                <div className={`my-2 ${colors.accent} text-xs italic`}>
                  [Reddit gallery post: <a href={url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  };

export default RedditPostsSection;
