'use client';

import { useState } from 'react';
import type { Channel, FdMatch } from '@/types';
import type { ResolvedChannel } from '@/lib/mapping';
import VideoPlayer from '@/components/VideoPlayer';
import ChannelSelector from '@/components/ChannelSelector';
import { isLive } from '@/lib/competitions';
import { formatKickoffDateTime } from '@/lib/local-time';

export default function WatchClient({
  match,
  resolved,
}: {
  match: FdMatch;
  resolved: ResolvedChannel[];
}) {
  const first = resolved.find((rc) => rc.channel)?.channel ?? null;
  const [channel, setChannel] = useState<Channel | null>(first);

  const live = isLive(match.status);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-white">
            {match.home.shortName} <span className="text-white/40">vs</span> {match.away.shortName}
          </h1>
          <p className="text-xs text-white/40">
            {match.competitionName} · {formatKickoffDateTime(match.utcDate)}
          </p>
        </div>
        {live && (
          <span className="flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE {match.score.home ?? 0}–{match.score.away ?? 0}
          </span>
        )}
      </header>

      <VideoPlayer channel={channel} />

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">Channels</h2>
        <ChannelSelector resolved={resolved} current={channel} onSelect={setChannel} />
      </section>
    </>
  );
}
