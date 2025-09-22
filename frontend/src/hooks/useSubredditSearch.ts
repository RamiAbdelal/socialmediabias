"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubredditSuggestion } from '@/lib/types';
import { LRUCache } from '@/lib/utils';
import { popularSubreddits } from '@/lib/popularSubreddits.js';

const CACHE = new LRUCache<string, SubredditSuggestion[]>(100);

export function useSubredditSearch(query: string, limit = 10) {
  const raw = (query || '').trim();
  const [q, setQ] = useState(raw);
  const [items, setItems] = useState<SubredditSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doFallback = useMemo(() => {
    if (!q) return [] as SubredditSuggestion[];
    const lower = q.toLowerCase();
    const suggestions = (popularSubreddits as { name: string; url: string }[]).map(p => ({ name: `r/${p.name.replace(/^r\//i,'')}` }));
    return suggestions
      .filter(s => s.name.includes(lower))
      .slice(0, limit);
  }, [q, limit]);

  // Debounce raw input → q
  useEffect(() => {
    const t = setTimeout(() => setQ(raw), 250);
    return () => clearTimeout(t);
  }, [raw]);

  useEffect(() => {
    setError(null);
    if (!q || q.length < 2) { setItems([]); return; }
    const key = `${q}|${limit}`;
    const cached = CACHE.get(key);
    if (cached) { setItems(cached); return; }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    fetch(`/api/subreddit/search?q=${encodeURIComponent(q)}&limit=${limit}`, { signal: ac.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('bad status')))
      .then((j: { items: SubredditSuggestion[] }) => {
        const list = Array.isArray(j?.items) ? j.items : [];
        CACHE.set(key, list);
        setItems(list.length ? list : doFallback);
      })
      .catch(() => setItems(doFallback))
      .finally(() => setLoading(false));

    return () => { ac.abort(); };
  }, [q, limit, doFallback]);

  return { items, loading, error } as const;
}
