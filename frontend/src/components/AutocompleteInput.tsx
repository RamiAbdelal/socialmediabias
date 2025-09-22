"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubredditSuggestion } from '@/lib/types';
import { useSubredditSearch } from '@/hooks/useSubredditSearch';
import { popularSubreddits } from '@/lib/popularSubreddits.js';
import Image from 'next/image';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: SubredditSuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

const RECENTS_KEY = 'smb_recent_subreddits';

function loadRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]'); } catch { return []; }
}
function saveRecent(name: string) {
  try {
    const arr = loadRecents().filter(n => n !== name);
    arr.unshift(name);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(arr.slice(0, 8)));
  } catch {}
}

export function AutocompleteInput({ value, onChange, onSelect, placeholder, autoFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { items, loading } = useSubredditSearch(value, 10);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => { setRecents(loadRecents()); }, []);

  const emptyStateItems: SubredditSuggestion[] = useMemo(() => {
    const popular = [] as SubredditSuggestion[];
    try {
      for (const p of popularSubreddits as { name: string }[]) popular.push({ name: p.name.startsWith('r/') ? p.name : `r/${p.name}` });
    } catch {}
    const recentItems = recents.map(n => ({ name: n }));
    const dedup = new Map<string, SubredditSuggestion>();
    for (const it of [...recentItems, ...popular]) dedup.set(it.name.toLowerCase(), it);
    return Array.from(dedup.values()).slice(0, 10);
  }, [recents]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true);
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0))); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const src = (items.length ? items : emptyStateItems);
      if (src[active]) { onSelect(src[active]); saveRecent(src[active].name); }
      setOpen(false);
    }
    if (e.key === 'Escape') { setOpen(false); }
  }, [open, items, active, onSelect, emptyStateItems]);

  useEffect(() => { if (open) setActive(0); }, [value, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t) return;
      const container = listRef.current?.parentElement;
      if (container && !container.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative w-full">
      <input
        className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-controls="subreddit-autocomplete"
      />
      {open && (
        <ul id="subreddit-autocomplete" ref={listRef} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {loading && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
          {!loading && value.trim().length < 2 && emptyStateItems.map((it, idx) => (
            <li
              key={`empty-${it.name}`}
              role="option"
              aria-selected={active === idx}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => { e.preventDefault(); onSelect(it); saveRecent(it.name); setOpen(false); }}
              className={`flex items-center justify-between gap-2 rounded px-3 py-2 text-sm cursor-pointer ${active === idx ? 'bg-accent/30' : 'hover:bg-accent/20'}`}
            >
              <div className="truncate font-medium">{it.name}</div>
            </li>
          ))}
          {!loading && value.trim().length >= 2 && items.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>}
          {!loading && value.trim().length >= 2 && items.map((it, idx) => (
            <li
              key={it.name}
              role="option"
              aria-selected={active === idx}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => { e.preventDefault(); onSelect(it); saveRecent(it.name); setOpen(false); }}
              className={`flex items-center justify-between gap-2 rounded px-3 py-2 text-sm cursor-pointer ${active === idx ? 'bg-accent/30' : 'hover:bg-accent/20'}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {it.icon ? <Image width={50} height={50} src={it.icon} alt="" className="h-5 w-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} /> : <span className="h-5 w-5 rounded-full bg-secondary/50" />}
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {(() => {
                      const q = value.trim().toLowerCase();
                      const n = it.name;
                      const i = q ? n.toLowerCase().indexOf(q) : -1;
                      if (i < 0) return n;
                      const pre = n.slice(0, i);
                      const mid = n.slice(i, i + q.length);
                      const post = n.slice(i + q.length);
                      return (
                        <>
                          {pre}
                          <span className="text-primary font-semibold">{mid}</span>
                          {post}
                        </>
                      );
                    })()}
                  </div>
                  {it.title && <div className="truncate text-xs text-muted-foreground">{it.title}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {it.subscribers ? <span className="text-[10px] text-muted-foreground">{Intl.NumberFormat().format(it.subscribers)}</span> : null}
                {it.nsfw ? <span className="rounded bg-red-600/20 px-1.5 py-0.5 text-[10px] text-red-500">NSFW</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
