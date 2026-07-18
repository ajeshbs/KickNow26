'use client';

import type { Channel } from '@/types';
import type { ResolvedChannel } from '@/lib/mapping';
import Link from 'next/link';

interface Props {
  resolved: ResolvedChannel[];
  current: Channel | null;
  onSelect: (channel: Channel) => void;
}

export default function ChannelSelector({ resolved, current, onSelect }: Props) {
  if (resolved.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-navy-900 p-6 text-center">
        <p className="text-sm text-white/50">No channels mapped for this competition.</p>
        <Link href="/settings" className="mt-2 inline-block text-sm text-gold-300 hover:underline">
          Open Settings →
        </Link>
      </div>
    );
  }

  const byLabel = new Map<string, ResolvedChannel[]>();
  for (const rc of resolved) {
    const label = rc.pin.label || 'Other';
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(rc);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byLabel.entries()].map(([label, list]) => (
        <div key={label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">{label}</h3>
          <div className="flex flex-wrap gap-2">
            {list.map((rc) =>
              rc.channel ? (
                <button
                  key={rc.pin.id}
                  onClick={() => onSelect(rc.channel!)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    current?.url === rc.channel.url
                      ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                      : 'border-white/10 bg-navy-900 text-white/80 hover:bg-navy-800'
                  }`}
                >
                  {rc.channel.name}
                </button>
              ) : (
                <span
                  key={rc.pin.id}
                  className="cursor-not-allowed rounded-lg border border-white/5 bg-navy-900/50 px-4 py-2 text-sm text-white/25"
                  title="Channel no longer in playlist — re-pin in Settings"
                >
                  {rc.pin.name} ⚠
                </span>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
