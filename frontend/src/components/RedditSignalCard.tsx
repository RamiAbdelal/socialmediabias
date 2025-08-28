import React, { useState, useMemo } from 'react';
import { Image } from '@heroui/react';
import { isImageUrl, isGalleryUrl } from '../lib/utils';
import type { RedditSignal } from '../lib/types';
import { Reddit } from '../lib/types';

// Wrapped API response shape we observed (object with body: [postListing, commentListing])
interface WrappedAPIResponse { body: Reddit.APIResponse }
type CommentStoreValue = string | null | WrappedAPIResponse | undefined; // null=loading

interface RedditSignalCardProps {
  d: RedditSignal;
  ogImages: Record<string, string | null>;
  commentBodies: Record<string, CommentStoreValue>;
  setCommentBodies: React.Dispatch<React.SetStateAction<Record<string, CommentStoreValue>>>;
  fetchRedditCommentBody: (permalink: string) => Promise<string | null>;
  isRedditCommentPermalink: (permalink: string) => boolean;
  openCommentPermalink: string | null;
  setOpenCommentPermalink: React.Dispatch<React.SetStateAction<string | null>>;
}

function isWrappedAPIResponse(v: unknown): v is WrappedAPIResponse {
  return typeof v === 'object' && v !== null && 'body' in v && Array.isArray((v as { body: unknown }).body) && (v as { body: unknown[] }).body.length === 2;
}

const RedditSignalCard: React.FC<RedditSignalCardProps> = ({
  d,
  ogImages,
  commentBodies,
  setCommentBodies,
  fetchRedditCommentBody,
  isRedditCommentPermalink,
  openCommentPermalink,
  setOpenCommentPermalink,
}) => {
  // Local depth state for comment tree expansion (initial depth = 3)
  const [maxDepth, setMaxDepth] = useState<number>(3);

  // Attempt to extract a Reddit APIResponse from stored commentBodies for this permalink
  const commentApiResponse: Reddit.APIResponse | null = useMemo(() => {
    if (!d.permalink) return null;
    const raw = commentBodies[d.permalink];
    if (isWrappedAPIResponse(raw)) return raw.body;
    return null;
  }, [commentBodies, d.permalink]);

  // Extract top-level comments listing
  const topLevelComments: Reddit.Comment[] = useMemo(() => {
    if (!commentApiResponse) return [];
    const commentListing = commentApiResponse[1];
    if (commentListing?.data?.children) {
      // Filter only t1 comment kinds
  return commentListing.data.children.filter((c): c is Reddit.Comment => c.kind === 't1');
    }
    return [];
  }, [commentApiResponse]);

  // Recursive renderer
  const renderComments = (comments: Reddit.Comment[], depth: number): React.ReactNode => {
    if (!comments || comments.length === 0) return null;
    return comments.map((c) => {
      const data = c.data;
  const hasReplies = data.replies && typeof data.replies === 'object' && data.replies.data?.children?.length > 0;
  const repliesListing = hasReplies ? (data.replies as Reddit.Listing<Reddit.Comment>).data.children.filter((r): r is Reddit.Comment => r.kind === 't1') : [];
      const showReplies = depth + 1 < maxDepth; // we will render deeper replies if within depth budget (depth starts at 0 for top-level)
      return (
        <div key={data.id} className="mt-2">
          <div className="pl-2 border-l border-neutral-600">
            <div className="text-xs text-blue-200 font-semibold flex flex-wrap gap-2">
              <span>@{data.author}</span>
              <span className="text-neutral-400">▲{data.ups}</span>
              {data.distinguished && <span className="text-amber-400">{data.distinguished}</span>}
              {data.is_submitter && <span className="text-emerald-400">OP</span>}
            </div>
            <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words">
              {data.body}
            </div>
            {hasReplies && showReplies && (
              <div className="mt-1 ml-2">
                {renderComments(repliesListing, depth + 1)}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  // Determine if deeper replies exist beyond current maxDepth to show expansion button
  const deeperAvailable = useMemo(() => {
    if (!commentApiResponse) return false;
    // BFS up to maxDepth, if any node at depth === maxDepth - 1 has replies we can go deeper
  const queue: { node: Reddit.Comment; depth: number }[] = topLevelComments.map(c => ({ node: c, depth: 0 }));
    while (queue.length) {
      const { node, depth } = queue.shift()!;
      if (depth >= maxDepth - 1) {
        const data = node.data;
  if (data.replies && typeof data.replies === 'object' && (data.replies as Reddit.Listing<Reddit.Comment>).data?.children?.some((ch): ch is Reddit.Comment => ch.kind === 't1')) {
          return true;
        }
        continue;
      }
      const data = node.data;
      if (data.replies && typeof data.replies === 'object') {
  const kids = (data.replies as Reddit.Listing<Reddit.Comment>).data?.children?.filter((ch): ch is Reddit.Comment => ch.kind === 't1') || [];
        kids.forEach(k => queue.push({ node: k, depth: depth + 1 }));
      }
    }
    return false;
  }, [commentApiResponse, topLevelComments, maxDepth]);

  return (
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
                    setOpenCommentPermalink(d.permalink!);
                    setCommentBodies(prev => ({ ...prev, [d.permalink!]: null }));
                    const body = await fetchRedditCommentBody(d.permalink!);
                    setCommentBodies(prev => ({ ...prev, [d.permalink!]: body }));
                  }}
                >
                  Load Comments
                </button>
              )}
              {commentBodies[d.permalink] !== undefined && openCommentPermalink !== d.permalink && (
                <button
                  className="ml-2 px-2 py-1 rounded bg-neutral-700 text-white text-xs hover:bg-neutral-600 transition border border-neutral-500"
                  onClick={() => setOpenCommentPermalink(d.permalink!)}
                >
                  Show
                </button>
              )}
              {openCommentPermalink === d.permalink && (
                <button
                  className="ml-2 px-2 py-1 rounded bg-neutral-700 text-white text-xs hover:bg-neutral-600 transition border border-neutral-500"
                  onClick={() => setOpenCommentPermalink(null)}
                >
                  Hide
                </button>
              )}
              {commentBodies[d.permalink] === null && openCommentPermalink === d.permalink && (
                <span className="italic text-gray-400">Loading comment...</span>
              )}
              {/* Raw string case (legacy) */}
              {openCommentPermalink === d.permalink && typeof commentBodies[d.permalink] === 'string' && commentBodies[d.permalink] !== '' && (
                <div className="mt-1 bg-neutral-900 rounded p-2 text-xs text-white/90 border border-neutral-700">
                  <span>{commentBodies[d.permalink] as string}</span>
                </div>
              )}
              {/* Structured comments case */}
              {openCommentPermalink === d.permalink && commentApiResponse && topLevelComments.length > 0 && (
                <div className="mt-2 bg-neutral-900/70 rounded p-2 border border-neutral-700 max-h-[600px] overflow-auto">
                  <div className="text-xs text-neutral-400 mb-1 flex justify-between items-center">
                    <span>Comments (levels shown: {maxDepth})</span>
                    {deeperAvailable && (
                      <button
                        onClick={() => setMaxDepth(md => md + 1)}
                        className="px-2 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-2xs border border-neutral-500"
                      >+ depth</button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {renderComments(topLevelComments, 0)}
                  </div>
                  <RawJsonToggle raw={commentBodies[d.permalink]} />
                </div>
              )}
              {openCommentPermalink === d.permalink && commentBodies[d.permalink] === '' && (
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
};

// Dev-only raw JSON toggle component
const RawJsonToggle: React.FC<{ raw: CommentStoreValue }> = ({ raw }) => {
  const [open, setOpen] = useState(false);
  if (!raw || typeof raw !== 'object') return null;
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-2xs text-white"
        type="button"
      >{open ? 'Hide Raw JSON' : 'Show Raw JSON'}</button>
      {open && (
        <pre className="mt-2 max-h-72 overflow-auto text-[10px] leading-snug bg-black/60 p-2 rounded border border-neutral-700 whitespace-pre-wrap break-all">
{JSON.stringify(raw, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default RedditSignalCard;
