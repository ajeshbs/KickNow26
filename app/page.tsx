import Navigation from '@/components/Navigation';
import MadridHero from '@/components/MadridHero';
import FixtureList from '@/components/FixtureList';
import MatchCard from '@/components/MatchCard';
import { getCompMatches, getMadridMatches } from '@/lib/football-data';
import { COMPETITIONS, isLive, isUpcoming } from '@/lib/competitions';
import type { FdMatch } from '@/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function pickHeroMatch(matches: FdMatch[]): FdMatch | null {
  const live = matches.find((m) => isLive(m.status));
  if (live) return live;
  const upcoming = matches
    .filter((m) => isUpcoming(m.status))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  return upcoming[0] ?? null;
}

function todayOf(matches: FdMatch[]): FdMatch[] {
  const now = new Date();
  return matches.filter((m) => {
    const d = new Date(m.utcDate);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });
}

export default async function HomePage() {
  const madrid = await getMadridMatches().catch(() => [] as FdMatch[]);
  const leagueLists = await Promise.all(
    COMPETITIONS.map(async (c) => ({
      comp: c,
      matches: await getCompMatches(c.code).catch(() => [] as FdMatch[]),
    })),
  );

  const hero = pickHeroMatch(madrid);

  const todayById = new Map<number, FdMatch>();
  for (const m of todayOf(madrid)) todayById.set(m.id, m);
  for (const { matches } of leagueLists) {
    for (const m of todayOf(matches)) if (!todayById.has(m.id)) todayById.set(m.id, m);
  }
  const today = [...todayById.values()].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
  );

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6">
        <MadridHero match={hero} />

        {today.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">Today</h2>
            <FixtureList matches={today} showCompetition />
          </section>
        )}

        {leagueLists.map(({ comp, matches }) => {
          const upcoming = matches
            .filter((m) => isUpcoming(m.status) || isLive(m.status))
            .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
            .slice(0, 6);
          if (upcoming.length === 0) return null;
          return (
            <section key={comp.code}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">{comp.name}</h2>
                <Link href={`/league/${comp.code}`} className="text-xs text-gold-300 hover:underline">
                  View all →
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
