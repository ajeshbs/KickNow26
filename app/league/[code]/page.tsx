import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import LeagueTabs from './LeagueTabs';
import { getCompetition } from '@/lib/competitions';
import { getCompMatches, getScorers, getStandings } from '@/lib/football-data';
import type { FdMatch, FdScorer, FdStanding } from '@/types';

export const dynamic = 'force-dynamic';

export default async function LeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const comp = getCompetition(code);
  if (!comp) notFound();

  const [matches, standings, scorers] = await Promise.all([
    getCompMatches(comp.code).catch(() => [] as FdMatch[]),
    getStandings(comp.code).catch(() => [] as FdStanding[]),
    getScorers(comp.code).catch(() => [] as FdScorer[]),
  ]);

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <h1 className="flex items-center gap-3 text-xl font-bold text-white">
          {comp.emblem && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comp.emblem} alt="" className="h-8 w-8 object-contain" />
          )}
          {comp.name}
        </h1>
        <LeagueTabs matches={matches} standings={standings} scorers={scorers} />
      </main>
    </>
  );
}
