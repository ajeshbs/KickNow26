'use client';

import Link from 'next/link';
import type { FdMatch } from '@/types';
import { isLive } from '@/lib/competitions';
import { formatKickoffDateTime } from '@/lib/local-time';

function Crest({ src, alt }: { src: string; alt: string }) {
  if (!src) return <span className="h-14 w-14 rounded-full bg-white/10" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-14 w-14 object-contain sm:h-20 sm:w-20" />;
}

export default function MadridHero({ match }: { match: FdMatch | null }) {
  if (!match) {
    return (
      <section className="rounded-2xl border border-white/10 bg-navy-900 p-8 text-center text-white/40">
        No upcoming Real Madrid match found.
      </section>
    );
  }

  const live = isLive(match.status);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border p-6 sm:p-10 ${
        live ? 'border-gold-400/60 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900' : 'border-white/10 bg-navy-900'
      }`}
    >
      {live && (
        <span className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold text-red-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          LIVE
        </span>
      )}

      <p className="mb-6 text-center text-xs uppercase tracking-widest text-gold-300">
        {match.competitionName}
      </p>

      <div className="flex items-center justify-center gap-6 sm:gap-12">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <Crest src={match.home.crest} alt={match.home.name} />
          <span className="text-sm font-semibold text-white sm:text-lg">{match.home.shortName}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          {live || match.status === 'FINISHED' ? (
            <span className="text-4xl font-black text-white sm:text-6xl">
              {match.score.home ?? 0}–{match.score.away ?? 0}
            </span>
          ) : (
            <span className="text-2xl font-black text-white/30 sm:text-4xl">VS</span>
          )}
          <span className="text-xs text-white/50">{formatKickoffDateTime(match.utcDate)}</span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <Crest src={match.away.crest} alt={match.away.name} />
          <span className="text-sm font-semibold text-white sm:text-lg">{match.away.shortName}</span>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href={`/watch/${match.id}`}
          className="rounded-xl bg-gold-400 px-10 py-3 text-sm font-bold text-navy-950 shadow-lg shadow-gold-400/20 transition-opacity hover:opacity-90"
        >
          {live ? '▶ Watch now' : 'Open match'}
        </Link>
      </div>
    </section>
  );
}
