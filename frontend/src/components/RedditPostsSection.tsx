import React from 'react';
import Image from 'next/image';
import type { RedditPost, SubredditResultsProps, AnalysisResult } from '../lib/types';
import { isImageUrl, isGalleryUrl } from '../lib/utils';

interface RedditPostsSectionProps {
  result: AnalysisResult | null;
}

const RedditPostsSection: React.FC<RedditPostsSectionProps> = ({ result }) => { 
  
  return (

    <div className="bg-gradient-to-br from-green-900/70 via-gray-900/80 to-yellow-800/40 shadow-lg rounded-2xl p-6 border border-yellow-400/20">
      <h2 className="text-2xl font-semibold mb-6 bg-gradient-to-r from-green-300 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">Reddit Posts</h2>
      {(!result?.overallScore || !result?.details) && (
        <div className="mb-4 text-yellow-200">No MBFC bias data found. Showing real Reddit post data only.</div>
      )}
      <ul className="divide-y divide-yellow-400/10">
        {result?.redditPosts?.map((post: RedditPost, idx: number) => {
          const url = post.url;
          const isImage = isImageUrl(url);
          const isGallery = isGalleryUrl(url);
          return (
            <li key={idx} className="py-4">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-yellow-200 font-medium hover:underline">
                {post.title}
              </a>
              <div className="text-sm text-yellow-300">by {post.author} | Score: {post.score}</div>
              <div className="text-xs text-yellow-400 break-all mb-2">{url}</div>
              {isImage && (
                <div className="my-2">
                  <Image
                    src={url}
                    alt={post.title}
                    width={600}
                    height={400}
                    className="rounded-lg max-h-80 w-auto border border-yellow-400/10 shadow-md mx-auto"
                    style={{ objectFit: 'contain', height: 'auto', maxHeight: '20rem' }}
                    loading="lazy"
                    unoptimized
                  />
                </div>
              )}
              {isGallery && (
                <div className="my-2 text-emerald-300 text-xs italic">
                  [Reddit gallery post: <a href={url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
    )

  };

export default RedditPostsSection;
