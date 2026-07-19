import Navigation from '@/components/Navigation';
import MadridHero from '@/components/MadridHero';
import FixtureList from '@/components/FixtureList';
import { getMadridMatches } from '@/lib/football-data';
import { isLive, isUpcoming } from '@/lib/competitions';
import type { FdMatch } from '@/types';

export const dynamic = 'force-dynamic';

function pickHeroMatch(matches: FdMatch[]): FdMatch | null {
  const live = matches.find((m) => isLive(m.status));
  if (live) return live;
  const upcoming = matches
    .filter((m) => isUpcoming(m.status))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  return upcoming[0] ?? null;
}

export default async function HomePage() {
  const matches = await getMadridMatches().catch(() => [] as FdMatch[]);

  const hero = pickHeroMatch(matches);
  const upcoming = matches
    .filter((m) => isUpcoming(m.status) || isLive(m.status))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 10);
  const results = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 10);

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6">
        <MadridHero match={hero} />

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
            Upcoming
          </h2>
          <FixtureList matches={upcoming} showCompetition />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">
            Results
          </h2>
          <FixtureList matches={results} showCompetition />
        </section>
      </main>
    </>
  );
}
