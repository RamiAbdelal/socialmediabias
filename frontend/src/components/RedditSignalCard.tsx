import React from 'react';
import { Image } from '@heroui/react';
import { isImageUrl, isGalleryUrl } from '../lib/utils';
import type { RedditSignal } from '../lib/types';

interface RedditSignalCardProps {
  d: RedditSignal;
  ogImages: { [url: string]: string | null };
  commentBodies: { [permalink: string]: string | null };
  setCommentBodies: React.Dispatch<React.SetStateAction<{ [permalink: string]: string | null }>>;
  fetchRedditCommentBody: (permalink: string) => Promise<string | null>;
  isRedditCommentPermalink: (permalink: string) => boolean;
}

const RedditSignalCard: React.FC<RedditSignalCardProps> = ({
  d,
  ogImages,
  commentBodies,
  setCommentBodies,
  fetchRedditCommentBody,
  isRedditCommentPermalink,
}) => (
  <div className="bg-neutral-800 rounded-xl p-4 flex flex-col shadow-md">
    <div className="flex flex-col items-start mb-2">
      {/* Bias Label or Reddit Title */}
      <div className="text-blue-100 text-xl">{d.title}</div>
      {d.bias && (
        <div className="text-blue-100 text-lg py-3">
          {/* Bias Icon */}
          <span className="mr-2">
            {d.bias === 'Left' && <span title="Left" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-800 rounded-full" />}
            {d.bias === 'Left-Center' && <span title="Left-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-300 to-blue-600 rounded-full" />}
            {d.bias === 'Least Biased' && <span title="Least Biased" className="inline-block w-5 h-5 bg-gradient-to-br from-green-400 to-green-700 rounded-full" />}
            {d.bias === 'Right-Center' && <span title="Right-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-orange-300 to-orange-600 rounded-full" />}
            {d.bias === 'Right' && <span title="Right" className="inline-block w-5 h-5 bg-gradient-to-br from-red-400 to-red-700 rounded-full" />}
            {d.bias === 'Questionable' && <span title="Questionable" className="inline-block w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full" />}
            {!d.bias && <span className="inline-block w-5 h-5 bg-gray-400 rounded-full" />}
          </span>
          {d.bias}
        </div>
      )}
      <div className="flex gap-2 text-sm">
        {d.credibility && (
          <span className="px-2 py-0.5 rounded bg-yellow-800/60 text-xs font-semibold" title="Credibility">
            Credibility: {d.credibility}
          </span>
        )}
        {d.factual_reporting && (
          <span className="px-2 py-0.5 rounded bg-emerald-800/60 text-white text-xs font-semibold" title="Factual Reporting">
            Factual Reporting: {d.factual_reporting}
          </span>
        )}
      </div>
    </div>
    {/* Reddit author and score (same block/line) */}
    <div className='flex items-center mb-2'>
      {(d.author || typeof d.score === 'number') && (
        <span className="text-sm">
          {d.author && <>by {d.author}</>}
          {d.author && typeof d.score === 'number' && ' | '}
          {typeof d.score === 'number' && <>Score: {d.score}</>}
        </span>
      )}
    </div>
    <div className="mr-4">
      {isImageUrl(d.url) && (
        <div className="my-2 flex flex-col items-center">
          <Image
            src={d.url}
            alt={d.url}
            width={600}
            height={400}
            className="rounded-lg max-h-80 w-auto shadow-md mx-auto"
            style={{ objectFit: 'contain', height: 'auto' }}
            loading="lazy"
          />
        </div>
      )}
      {isGalleryUrl(d.url) && (
        <div className="my-2 text-emerald-300 text-xs italic">
          [Reddit gallery post: <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
        </div>
      )}
      {/* OG:image preview for non-image URLs */}
      {!isImageUrl(d.url) && !isGalleryUrl(d.url) && ogImages[d.url] && (
        <div className="my-2 flex flex-col items-center">
          <Image
            src={ogImages[d.url] as string}
            alt={d.url}
            width={600}
            height={400}
            className="rounded-lg max-h-80 w-auto shadow-md mx-auto"
            style={{ objectFit: 'contain', height: 'auto' }}
            loading="lazy"
          />
        </div>
      )}
      <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline break-all hover:text-yellow-400 text-sm">
        {d.url}
      </a>
      {d.permalink && (
        <div className="mt-1">
          <a
            href={`https://reddit.com${d.permalink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-300 text-xs hover:text-yellow-400 break-all"
          >
            Reddit Permalink
          </a>
          {/* Show Reddit comment body if this is a comment permalink, with on-demand loading */}
          {isRedditCommentPermalink(d.permalink) && (
            <div className="mt-1">
              {commentBodies[d.permalink] === undefined && (
                <button
                  className="px-2 py-1 rounded bg-blue-700 text-white text-xs hover:bg-blue-600 transition border border-blue-900"
                  onClick={async () => {
                    setCommentBodies(prev => ({ ...prev, [d.permalink!]: null }));
                    const body = await fetchRedditCommentBody(d.permalink!);
                    setCommentBodies(prev => ({ ...prev, [d.permalink!]: body }));
                  }}
                >
                  Load Comment
                </button>
              )}
              {commentBodies[d.permalink] === null && (
                <span className="italic text-gray-400">Loading comment...</span>
              )}
              {typeof commentBodies[d.permalink] === 'string' && commentBodies[d.permalink] !== '' && (
                <div className="mt-1 bg-neutral-900 rounded p-2 text-xs text-white/90 border border-neutral-700">
                  <span>{commentBodies[d.permalink]}</span>
                </div>
              )}
              {commentBodies[d.permalink] === '' && (
                <span className="italic text-red-400">Could not load comment.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    {(d.source_name || d.media_type || d.country || d.source_url) && (
      <div className="flex flex-wrap gap-2 text-xs text-yellow-300 my-2">
        {d.source_name && <span title="Source Name" className="font-semibold">{d.source_name}</span>}
        {d.media_type && <span title="Media Type">[{d.media_type}]</span>}
        {d.country && <span title="Country">{d.country}</span>}
        {d.source_url && <span title="Source Domain">({d.source_url})</span>}
      </div>
    )}
    {(d.created_at || d.id) && (
      <div className="flex flex-wrap gap-2 text-xs text-yellow-400 mb-2">
        {d.created_at && <span title="MBFC Entry Date">Added: {new Date(d.created_at).toLocaleDateString()}</span>}
        {d.id && <span title="MBFC DB ID">ID: {d.id}</span>}
      </div>
    )}
    {d.mbfc_url && (
      <div className="mt-2">
        <a href={d.mbfc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded bg-yellow-700/80 text-yellow-100 font-semibold text-xs hover:bg-yellow-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 21a4 4 0 005.657 0l.707-.707a4 4 0 000-5.657l-9.9-9.9a4 4 0 00-5.657 0l-.707.707a4 4 0 000 5.657l9.9 9.9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.343 17.657l1.414-1.414" /></svg>
          MBFC Article
        </a>
      </div>
    )}
  </div>
);

export default RedditSignalCard;
