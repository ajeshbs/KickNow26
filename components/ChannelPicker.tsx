'use client';

import { useEffect, useRef, useState } from 'react';
import type { Competition } from '@/lib/competitions';
import type { ChannelInfo, MappedChannel } from '@/types';

interface Props {
  competition: Competition;
  pins: MappedChannel[];
  onChange: (pins: MappedChannel[]) => void;
}

export default function ChannelPicker({ competition, pins, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChannelInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/channels?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { channels: ChannelInfo[] };
        setResults(data.channels);
      } catch {
        setSearchError('Search failed — is IPTV_M3U_URL configured?');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function addPin(ch: ChannelInfo) {
    if (pins.some((p) => p.id === ch.id)) return;
    onChange([...pins, { id: ch.id, name: ch.name, label: ch.group || '' }]);
  }

  function removePin(id: string) {
    onChange(pins.filter((p) => p.id !== id));
  }

  function setLabel(id: string, label: string) {
    onChange(pins.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-navy-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/70">
        {competition.emblem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={competition.emblem} alt="" className="h-5 w-5 object-contain" />
        )}
        {competition.name}
        <span className="ml-auto text-xs font-normal normal-case text-white/30">
          {pins.length} pinned
        </span>
      </h2>

      {pins.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {pins.map((pin) => (
            <li key={pin.id} className="flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-white">{pin.name}</span>
              <input
                value={pin.label}
                onChange={(e) => setLabel(pin.id, e.target.value)}
                placeholder="Label (e.g. Spain)"
                className="w-32 rounded-md border border-white/10 bg-navy-900 px-2 py-1 text-xs text-white/80 outline-none focus:border-gold-400/60"
              />
              <button
                onClick={() => removePin(pin.id)}
                className="rounded-md p-1 text-white/40 hover:text-red-400"
                title="Remove"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (v.trim().length < 2) {
              setResults([]);
              setSearchError(null);
            }
          }}
          placeholder="Search your playlist… (e.g. dazn, sky sport)"
          className="w-full rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-gold-400/60"
        />
        {searching && (
          <span className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        )}
      </div>

      {searchError && <p className="mt-2 text-xs text-red-400">{searchError}</p>}

      {results.length > 0 && (
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-navy-950">
          {results.map((ch) => {
            const pinned = pins.some((p) => p.id === ch.id);
            return (
              <li key={ch.id}>
                <button
                  onClick={() => addPin(ch)}
                  disabled={pinned}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-40"
                >
                  <span className="min-w-0 flex-1 truncate text-white">{ch.name}</span>
                  <span className="shrink-0 text-xs text-white/30">{ch.group}</span>
                  <span className="shrink-0 text-gold-300">{pinned ? '✓' : '+'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
