"use client";

import { useState, useEffect, useRef } from "react";
import type { Icd10Code } from "@/lib/mbbs-api";
import { mbbsApi } from "@/lib/mbbs-api";

const cache = new Map<string, Icd10Code[]>();
const CACHE_SIZE = 50;

function getCached(query: string): Icd10Code[] | undefined {
  return cache.get(query.toLowerCase());
}

function setCache(query: string, data: Icd10Code[]) {
  if (cache.size >= CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(query.toLowerCase(), data);
}

interface Props {
  onSelect: (code: Icd10Code) => void;
  selectedCode?: string;
}

export function Icd10Search({ onSelect, selectedCode }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Icd10Code[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const cached = getCached(query);
    if (cached) {
      setResults(cached);
      setOpen(cached.length > 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await mbbsApi.searchIcd10(query);
        setCache(query, data);
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A] mb-1">
        ICD-10 Code Search
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-3 py-2 focus-within:border-[#0A2540] focus-within:ring-2 focus-within:ring-[#00D4B2]/20">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#2D3A4A]">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          placeholder="Search by code or description (e.g., I10, J18.9, diabetes)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-[#0A2540] placeholder:text-slate-400 outline-none"
        />
        {selectedCode && (
          <span className="rounded-full bg-[#00D4B2]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#00D4B2]">
            {selectedCode}
          </span>
        )}
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#00D4B2]" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200/60 bg-white shadow-lg py-1 max-h-60 overflow-y-auto">
          {results.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[#F8F9FA] transition-colors"
              >
                <span className="shrink-0 rounded-lg bg-[#0A2540]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0A2540]">
                  {item.code}
                </span>
                <span className="text-xs text-[#2D3A4A] leading-snug">
                  {item.description}
                  {item.category && (
                    <span className="block text-[9px] text-slate-400 mt-0.5">
                      {item.category}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
