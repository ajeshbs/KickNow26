'use client';

import type { StoredChannel } from '@/types';
import { getCountry, DOMESTIC_COUNTRY } from '@/lib/countries';
import Link from 'next/link';

interface Props {
  channels: StoredChannel[]; // pre-sorted: domestic country first
  compCode: string;
  current: StoredChannel | null;
  onSelect: (channel: StoredChannel) => void;
}

export default function ChannelSelector({ channels, compCode, current, onSelect }: Props) {
  if (channels.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-navy-900 p-6 text-center">
        <p className="text-sm text-white/50">No channels assigned to this competition.</p>
        <Link href="/settings" className="mt-2 inline-block text-sm text-gold-300 hover:underline">
          Open Settings →
        </Link>
      </div>
    );
  }

  const domestic = DOMESTIC_COUNTRY[compCode];
  const byCountry = new Map<string, StoredChannel[]>();
  for (const ch of channels) {
    if (!byCountry.has(ch.country)) byCountry.set(ch.country, []);
    byCountry.get(ch.country)!.push(ch);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byCountry.entries()].map(([code, list]) => {
        const country = getCountry(code);
        return (
          <div key={code}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              {country.flag} {country.name}
              {code === domestic && <span className="ml-2 text-gold-300/70">domestic</span>}
            </h3>
            <div className="flex flex-wrap gap-2">
              {list.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => onSelect(ch)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    current?.id === ch.id
                      ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                      : 'border-white/10 bg-navy-900 text-white/80 hover:bg-navy-800'
                  }`}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
