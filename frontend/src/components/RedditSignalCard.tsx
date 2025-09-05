import React, { useState, useMemo } from 'react';
import { isImageUrl, isGalleryUrl } from '../lib/utils';
import type { RedditSignal } from '../lib/types';
import { Reddit } from '../lib/types';

// Wrapped API response shape (object with body: [postListing, commentListing])
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
  return typeof v === 'object' && v !== null && 'body' in v && Array.isArray((v as { body: unknown }).body);
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
  const [maxDepth, setMaxDepth] = useState<number>(3);

  // Extract structured comment API response if loaded
  const commentApiResponse: Reddit.APIResponse | null = useMemo(() => {
    if (!d.permalink) return null;
    const raw = commentBodies[d.permalink];
    if (isWrappedAPIResponse(raw)) return raw.body;
    return null;
  }, [d.permalink, commentBodies]);

  const topLevelComments: Reddit.Comment[] = useMemo(() => {
    if (!commentApiResponse) return [];
    const commentListing = commentApiResponse[1];
    if (commentListing?.data?.children) {
      return commentListing.data.children.filter((c): c is Reddit.Comment => c.kind === 't1');
    }
    return [];
  }, [commentApiResponse]);

  const renderComments = (comments: Reddit.Comment[], depth: number): React.ReactNode => {
    if (!comments || comments.length === 0) return null;
    return comments.map((c) => {
      const data = c.data;
      const hasReplies = !!(data.replies && typeof data.replies === 'object' && (data.replies as Reddit.Listing<Reddit.Comment>).data?.children?.length);
      const repliesListing = hasReplies
        ? (data.replies as Reddit.Listing<Reddit.Comment>).data.children.filter((r): r is Reddit.Comment => r.kind === 't1')
        : [];
      const showReplies = depth + 1 < maxDepth;
      return (
        <div key={data.id} className="mt-2">
          <div className="text-xs text-muted-foreground font-semibold flex flex-wrap gap-2">
            <span>@{data.author}</span>
            <span className="text-foreground/60">▲{data.ups}</span>
            {data.distinguished && <span className="text-accent-foreground/80">{data.distinguished}</span>}
            {data.is_submitter && <span className="text-primary">OP</span>}
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {data.body}
          </div>
          {hasReplies && showReplies && (
            <div className="mt-1 ml-3 border-l border-border/50 pl-2">
              {renderComments(repliesListing, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const deeperAvailable = useMemo(() => {
    if (!commentApiResponse) return false;
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
    <div className="rounded-xl p-4 flex flex-col shadow-md bg-card/70 border border-border/60">
      <div className="flex flex-col items-start mb-2">
        <div className="text-xl text-foreground font-semibold">{d.title}</div>
        {d.bias && (
          <div className="text-lg py-3 text-foreground">
            <span className="mr-2">
              {d.bias === 'Left' && <span title="Left" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-700 rounded-full" />}
              {d.bias === 'Left-Center' && <span title="Left-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-blue-300 to-blue-600 rounded-full" />}
              {d.bias === 'Least Biased' && <span title="Least Biased" className="inline-block w-5 h-5 bg-gradient-to-br from-green-400 to-green-700 rounded-full" />}
              {d.bias === 'Right-Center' && <span title="Right-Center" className="inline-block w-5 h-5 bg-gradient-to-br from-orange-300 to-orange-600 rounded-full" />}
              {d.bias === 'Right' && <span title="Right" className="inline-block w-5 h-5 bg-gradient-to-br from-red-400 to-red-700 rounded-full" />}
              {d.bias === 'Questionable' && <span title="Questionable" className="inline-block w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full" />}
              {!d.bias && <span className="inline-block w-5 h-5 bg-muted rounded-full" />}
            </span>
            {d.bias}
          </div>
        )}
        <div className="flex gap-2 text-sm flex-wrap">
          {d.credibility && (
            <span className="px-2 py-0.5 rounded bg-secondary/30 text-xs font-semibold text-secondary-foreground/90" title="Credibility">
              Credibility: {d.credibility}
            </span>
          )}
          {d.factual_reporting && (
            <span className="px-2 py-0.5 rounded bg-primary/30 text-xs font-semibold text-primary-foreground" title="Factual Reporting">
              Factual Reporting: {d.factual_reporting}
            </span>
          )}
        </div>
      </div>
      <div className='flex items-center mb-2 text-muted-foreground'>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.url}
              alt={d.url}
              className="rounded-lg max-h-80 w-auto shadow-md mx-auto"
              loading="lazy"
            />
          </div>
        )}
        {isGalleryUrl(d.url) && (
          <div className="my-2 text-accent-foreground/80 text-xs italic">
            [Reddit gallery post: <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">View Gallery</a>]
          </div>
        )}
        {!isImageUrl(d.url) && !isGalleryUrl(d.url) && ogImages[d.url] && (
          <div className="my-2 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImages[d.url] as string}
              alt={d.url}
              className="rounded-lg max-h-80 w-auto shadow-md mx-auto"
              loading="lazy"
            />
          </div>
        )}
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline break-all hover:text-accent text-sm">
          {d.url}
        </a>
        {d.permalink && (
          <div className="mt-1">
            <a
              href={`https://reddit.com${d.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary/80 text-xs hover:text-primary break-all"
            >
              Reddit Permalink
            </a>
            {isRedditCommentPermalink(d.permalink) && (
              <div className="mt-1">
                {commentBodies[d.permalink] === undefined && (
                  <button
                    className="px-2 py-1 rounded bg-primary/30 text-primary-foreground text-xs hover:bg-primary/40 transition border border-primary/40"
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
                    className="ml-2 px-2 py-1 rounded bg-muted/40 text-xs hover:bg-muted/60 transition border border-border"
                    onClick={() => setOpenCommentPermalink(d.permalink!)}
                  >
                    Show
                  </button>
                )}
                {openCommentPermalink === d.permalink && (
                  <button
                    className="ml-2 px-2 py-1 rounded bg-muted/40 text-xs hover:bg-muted/60 transition border border-border"
                    onClick={() => setOpenCommentPermalink(null)}
                  >
                    Hide
                  </button>
                )}
                {commentBodies[d.permalink] === null && openCommentPermalink === d.permalink && (
                  <span className="italic text-muted-foreground">Loading comment...</span>
                )}
                {openCommentPermalink === d.permalink && typeof commentBodies[d.permalink] === 'string' && commentBodies[d.permalink] !== '' && (
                  <div className="mt-1 rounded p-2 text-xs text-foreground/90 border border-border bg-background/70">
                    <span>{commentBodies[d.permalink] as string}</span>
                  </div>
                )}
                {openCommentPermalink === d.permalink && commentApiResponse && topLevelComments.length > 0 && (
                  <div className="mt-2 rounded p-2 border border-border max-h-[600px] overflow-auto bg-background/60">
                    <div className="text-xs text-muted-foreground mb-1 flex justify-between items-center">
                      <span>Comments (levels shown: {maxDepth})</span>
                      {deeperAvailable && (
                        <button
                          onClick={() => setMaxDepth(md => md + 1)}
                          className="px-2 py-0.5 rounded bg-muted/50 hover:bg-muted/70 text-2xs border border-border"
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
                  <span className="italic text-destructive">Could not load comment.</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {(d.source_name || d.media_type || d.country || d.source_url) && (
        <div className="flex flex-wrap gap-2 text-xs text-accent-foreground my-2">
          {d.source_name && <span title="Source Name" className="font-semibold">{d.source_name}</span>}
          {d.media_type && <span title="Media Type">[{d.media_type}]</span>}
          {d.country && <span title="Country">{d.country}</span>}
          {d.source_url && <span title="Source Domain">({d.source_url})</span>}
        </div>
      )}
      {(d.created_at || d.id) && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
          {d.created_at && <span title="MBFC Entry Date">Added: {new Date(d.created_at).toLocaleDateString()}</span>}
          {d.id && <span title="MBFC DB ID">ID: {d.id}</span>}
        </div>
      )}
      {d.mbfc_url && (
        <div className="mt-2">
          <a href={d.mbfc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1 rounded bg-accent/30 text-accent-foreground font-semibold text-xs hover:bg-accent/50 transition border border-accent/40">
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
        className="px-2 py-0.5 rounded bg-muted/60 hover:bg-muted/70 border border-border text-2xs text-foreground"
        type="button"
      >{open ? 'Hide Raw JSON' : 'Show Raw JSON'}</button>
      {open && (
        <pre className="mt-2 max-h-72 overflow-auto text-[10px] leading-snug bg-background/80 p-2 rounded border border-border whitespace-pre-wrap break-all">
          {JSON.stringify(raw, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default RedditSignalCard;
