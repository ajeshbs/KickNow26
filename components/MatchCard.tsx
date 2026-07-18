'use client';

import Link from 'next/link';
import type { FdMatch } from '@/types';
import { isLive, isUpcoming } from '@/lib/competitions';
import { formatKickoffDateTime, formatKickoffTime, isToday } from '@/lib/local-time';

function Crest({ src, alt }: { src: string; alt: string }) {
  if (!src) return <span className="h-6 w-6 rounded-full bg-white/10 shrink-0" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-6 w-6 object-contain shrink-0" loading="lazy" />;
}

export default function MatchCard({ match, showCompetition = false }: { match: FdMatch; showCompetition?: boolean }) {
  const live = isLive(match.status);
  const upcoming = isUpcoming(match.status);
  const finished = match.status === 'FINISHED';
  const watchable = live || upcoming;

  const inner = (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        live
          ? 'border-gold-400/50 bg-gold-400/5 hover:bg-gold-400/10'
          : 'border-white/10 bg-navy-900 hover:bg-navy-800'
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <Crest src={match.home.crest} alt="" />
          <span className="truncate text-sm text-white">{match.home.shortName}</span>
          {finished || live ? (
            <span className="ml-auto text-sm font-semibold text-white">{match.score.home ?? '-'}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Crest src={match.away.crest} alt="" />
          <span className="truncate text-sm text-white">{match.away.shortName}</span>
          {finished || live ? (
            <span className="ml-auto text-sm font-semibold text-white">{match.score.away ?? '-'}</span>
          ) : null}
        </div>
      </div>

      <div className="flex w-20 shrink-0 flex-col items-end gap-1 text-right">
        {live ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gold-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        ) : finished ? (
          <span className="text-xs text-white/40">FT</span>
        ) : (
          <span className="text-xs text-white/60">
            {isToday(match.utcDate) ? formatKickoffTime(match.utcDate) : formatKickoffDateTime(match.utcDate)}
          </span>
        )}
        {showCompetition && (
          <span className="truncate text-[10px] uppercase tracking-wide text-white/30">
            {match.competitionName}
          </span>
        )}
      </div>
    </div>
  );

  return watchable ? <Link href={`/watch/${match.id}`}>{inner}</Link> : inner;
}
