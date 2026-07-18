import Navigation from '@/components/Navigation';
import FixtureList from '@/components/FixtureList';
import { getMadridMatches } from '@/lib/football-data';
import { isLive, isUpcoming } from '@/lib/competitions';
import type { FdMatch } from '@/types';

export const dynamic = 'force-dynamic';

export default async function MadridPage() {
  const matches = await getMadridMatches().catch(() => [] as FdMatch[]);

  const upcoming = matches
    .filter((m) => isUpcoming(m.status) || isLive(m.status))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const results = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6">
        <section>
          <h1 className="mb-4 text-xl font-bold text-white">
            Real Madrid <span className="text-gold-300">— all competitions</span>
          </h1>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">Upcoming</h2>
          <FixtureList matches={upcoming} showCompetition />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/60">Results</h2>
          <FixtureList matches={results.slice(0, 15)} showCompetition />
        </section>
      </main>
    </>
  );
}
