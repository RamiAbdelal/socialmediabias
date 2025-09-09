"use client";
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import type { RedditSignal } from '@/lib/types';

export interface FilterState {
  bias: string | null;
  credibility: string | null;
  factual_reporting: string | null;
  country: string | null;
  media_type: string | null;
  source_url: string | null;
}

export type FilterAction =
  | { type: 'SET'; field: keyof FilterState; value: string | null }
  | { type: 'CLEAR_ALL' };

export const initialFilterState: FilterState = {
  bias: null,
  credibility: null,
  factual_reporting: null,
  country: null,
  media_type: null,
  source_url: null
};

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'CLEAR_ALL':
      return initialFilterState;
    default:
      return state;
  }
}

interface FilterPanelProps {
  allDetails: RedditSignal[];
  biasBreakdown?: Record<string, number>;
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
}

interface OptionCount { value: string; count: number }

export const FilterPanel: React.FC<FilterPanelProps> = ({ allDetails, biasBreakdown, filters, dispatch }) => {
  // Compute generic option counts (excluding bias, where we can use biasBreakdown if supplied)
  const makeCounts = useCallback((getter: (d: RedditSignal) => string | undefined) => {
    const map = new Map<string, number>();
    for (const d of allDetails) {
      const v = getter(d);
      if (!v) continue;
      map.set(v, (map.get(v) || 0) + 1);
    }
    return Array.from(map.entries()).map(([value, count]) => ({ value, count })).sort((a,b) => b.count - a.count);
  }, [allDetails]);

  const credibilityCounts = useMemo(() => makeCounts(d => d.credibility), [makeCounts]);
  const factualCounts = useMemo(() => makeCounts(d => d.factual_reporting), [makeCounts]);
  const countryCounts = useMemo(() => makeCounts(d => d.country), [makeCounts]);
  const mediaTypeCounts = useMemo(() => makeCounts(d => d.media_type), [makeCounts]);
  const sourceUrlCounts: OptionCount[] = useMemo(() => makeCounts(d => d.source_url), [makeCounts]);
  const biasCounts: OptionCount[] = useMemo(() => {
    if (biasBreakdown) {
      return Object.entries(biasBreakdown).map(([value, count]) => ({ value, count }))
        .sort((a,b) => b.count - a.count);
    }
    return makeCounts(d => d.bias);
  }, [biasBreakdown, makeCounts]);

  const anyFilter = Object.values(filters).some(Boolean);

  const sourceWrapperRef = useRef<HTMLDivElement | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!sourceWrapperRef.current) return;
      if (!sourceWrapperRef.current.contains(e.target as Node)) setSourceOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (field: keyof FilterState, value: string) => {
    const current = filters[field];
    dispatch({ type: 'SET', field, value: current === value ? null : value });
  };

  const FilterGroup: React.FC<{ title: string; field: keyof FilterState; options: OptionCount[] }> = ({ title, field, options }) => (
    <div className="mb-4 mr-4">
      <div className="font-semibold text-sm mb-2">{title}</div>
      <div className="button-group flex flex-wrap">
        {options.map(opt => (
          <Button
            key={opt.value}
            size="sm"
            variant={filters[field] === opt.value ? 'default' : 'subtle'}
            className={`${filters[field] === opt.value ? 'ring-1 ring-yellow-400/60' : ''} text-xs px-2 py-1`}
            onClick={() => toggle(field, opt.value)}
            type="button"
          >{opt.value} ({opt.count})</Button>
        ))}
      </div>
    </div>
  );

  return (
    <Accordion className="w-full mb-4">
      <AccordionItem title={<h3 className="text-lg font-medium cursor-pointer">Filters</h3>} defaultOpen>
        <div className="flex flex-row items-start flex-wrap relative">
          {/* Source URL (dropdown) */}
          <div className="mb-4 mr-4 min-w-[300px]" ref={sourceWrapperRef}>
            <div className="font-semibold text-sm mb-2">Source URL</div>
            <button
              type="button"
              onClick={() => setSourceOpen(o => !o)}
              className="w-full text-left px-3 py-2 rounded-md border border-neutral-600 bg-neutral-800 text-xs hover:border-neutral-400 transition flex items-center justify-between"
            >
              <span className="truncate pr-2">{filters.source_url || 'Select Source URL'}</span>
              <span className="opacity-60">▾</span>
            </button>
            {sourceOpen && (
              <ul className="absolute z-50 mt-1 max-h-60 overflow-auto w-[300px] rounded-md border border-neutral-600 bg-neutral-900 shadow-xl text-xs">
                <li
                  className={`px-3 py-1 cursor-pointer hover:bg-neutral-700 ${!filters.source_url ? 'bg-neutral-700/40' : ''}`}
                  onClick={() => { dispatch({ type: 'SET', field: 'source_url', value: null }); setSourceOpen(false); }}
                >All Sources</li>
                {sourceUrlCounts.map(opt => (
                  <li
                    key={opt.value}
                    className={`px-3 py-1 cursor-pointer hover:bg-neutral-700 flex justify-between ${filters.source_url === opt.value ? 'bg-neutral-700/50' : ''}`}
                    onClick={() => { dispatch({ type: 'SET', field: 'source_url', value: opt.value }); setSourceOpen(false); }}
                  >
                    <span className="truncate max-w-[220px]" title={opt.value}>{opt.value}</span>
                    <span className="text-neutral-400 ml-2">{opt.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <FilterGroup title="Bias" field="bias" options={biasCounts} />
          <FilterGroup title="Credibility" field="credibility" options={credibilityCounts} />
          <FilterGroup title="Factual Reporting" field="factual_reporting" options={factualCounts} />
          <FilterGroup title="Country" field="country" options={countryCounts} />
          <FilterGroup title="Media Type" field="media_type" options={mediaTypeCounts} />
        </div>
        {(anyFilter) && (
          <button
            className="mt-2 px-4 py-1 rounded-full bg-yellow-400 text-emerald-900 font-bold text-xs border border-yellow-400 shadow hover:bg-yellow-300 transition"
            onClick={() => dispatch({ type: 'CLEAR_ALL' })}
            type="button"
          >Clear All Filters</button>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export function applyFilters(details: RedditSignal[], filters: FilterState) {
  return details.filter(d => {
    if (filters.bias && d.bias !== filters.bias) return false;
    if (filters.credibility && d.credibility !== filters.credibility) return false;
    if (filters.factual_reporting && d.factual_reporting !== filters.factual_reporting) return false;
    if (filters.country && d.country !== filters.country) return false;
    if (filters.media_type && d.media_type !== filters.media_type) return false;
    if (filters.source_url && d.source_url !== filters.source_url) return false;
    return true;
  });
}
