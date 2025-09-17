import { RedditSignal } from "./types";
import { type ClassValue } from 'clsx';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Default RedditSignal object for clean merging
export const defaultRedditSignal: RedditSignal = {
  url: '',
  bias: undefined,
  country: undefined,
  credibility: undefined,
  factual_reporting: undefined,
  id: undefined,
  mbfc_url: undefined,
  media_type: undefined,
  source_id: undefined,
  source_name: undefined,
  source_url: undefined,
  created_at: undefined,
  title: undefined,
  permalink: undefined,
  author: undefined,
  score: undefined,
};

// export const getBiasColor = (score: number) => {
//   if (score <= 2) return 'text-red-600';
//   if (score <= 4) return 'text-orange-600';
//   if (score <= 6) return 'text-yellow-600';
//   if (score <= 8) return 'text-blue-600';
//   return 'text-purple-600';
// };

// export const getConfidenceColor = (confidence: number) => {
//   if (confidence >= 0.8) return 'text-green-600';
//   if (confidence >= 0.6) return 'text-yellow-600';
//   return 'text-red-600';
// };

export const isImageUrl = (url: string) => {
  return /\.(jpe?g|png|gif|bmp|webp|avif)$/i.test(url) || url.includes('i.redd.it/');
};

export const isGalleryUrl = (url: string) => {
  return url.includes('reddit.com/gallery/');
};

// Utility className merge similar to shadcn template
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================
// Subreddit normalization utils
// ============================

/** Extract a subreddit name from input: URL, 'r/foo', or plain 'foo'. Returns 'r/foo' normalized or null. */
export function extractSubreddit(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  // Match full URL
  const urlMatch = raw.match(/reddit\.com\/r\/([A-Za-z0-9_]+)/i);
  if (urlMatch) return `r/${urlMatch[1]}`;
  // Match r/foo
  const rMatch = raw.match(/^r\/[A-Za-z0-9_]+$/i);
  if (rMatch) return raw.toLowerCase();
  // Plain word
  const word = raw.match(/^[A-Za-z0-9_]+$/);
  if (word) return `r/${raw.toLowerCase()}`;
  return null;
}

/** Ensure subreddit is formatted as 'r/foo'. */
export function formatSubreddit(name: string): string {
  if (!name) return '';
  return name.toLowerCase().startsWith('r/') ? name.toLowerCase() : `r/${name.toLowerCase()}`;
}

// ===============
// Small utilities
// ===============

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait = 250) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export class LRUCache<K, V> {
  private map = new Map<K, { v: V; at: number }>();
  constructor(private max = 50) {}
  get(key: K): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    this.map.set(key, { v: hit.v, at: Date.now() });
    return hit.v;
  }
  set(key: K, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { v: value, at: Date.now() });
    if (this.map.size > this.max) {
      const oldest = [...this.map.entries()].sort((a, b) => a[1].at - b[1].at)[0]?.[0];
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }
}