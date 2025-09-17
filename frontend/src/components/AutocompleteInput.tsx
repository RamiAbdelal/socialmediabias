"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubredditSuggestion } from '@/lib/types';
import { useSubredditSearch } from '@/hooks/useSubredditSearch';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: SubredditSuggestion) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function AutocompleteInput({ value, onChange, onSelect, placeholder, autoFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { items, loading } = useSubredditSearch(value, 10);
  const listRef = useRef<HTMLUListElement | null>(null);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true);
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0))); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); if (items[active]) onSelect(items[active]); setOpen(false); }
    if (e.key === 'Escape') { setOpen(false); }
  }, [open, items, active, onSelect]);

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
          {!loading && items.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>}
          {!loading && items.map((it, idx) => (
            <li
              key={it.name}
              role="option"
              aria-selected={active === idx}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => { e.preventDefault(); onSelect(it); setOpen(false); }}
              className={`flex items-center justify-between gap-2 rounded px-3 py-2 text-sm cursor-pointer ${active === idx ? 'bg-accent/30' : 'hover:bg-accent/20'}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {it.icon ? <img src={it.icon} alt="" className="h-5 w-5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} /> : <span className="h-5 w-5 rounded-full bg-secondary/50" />}
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.name}</div>
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
