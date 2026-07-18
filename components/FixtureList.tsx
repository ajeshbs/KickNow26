'use client';

import type { FdMatch } from '@/types';
import MatchCard from './MatchCard';
import { formatKickoffDate } from '@/lib/local-time';

export default function FixtureList({ matches, showCompetition = false }: { matches: FdMatch[]; showCompetition?: boolean }) {
  if (matches.length === 0) {
    return <p className="py-8 text-center text-sm text-white/40">No matches.</p>;
  }

  const byDay = new Map<string, FdMatch[]>();
  for (const m of matches) {
    const day = formatKickoffDate(m.utcDate);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(m);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">{day}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <MatchCard key={m.id} match={m} showCompetition={showCompetition} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
