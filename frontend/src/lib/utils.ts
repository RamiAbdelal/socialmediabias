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

export const getBiasColor = (score: number) => {
  if (score <= 2) return 'text-red-600';
  if (score <= 4) return 'text-orange-600';
  if (score <= 6) return 'text-yellow-600';
  if (score <= 8) return 'text-blue-600';
  return 'text-purple-600';
};

export const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};

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