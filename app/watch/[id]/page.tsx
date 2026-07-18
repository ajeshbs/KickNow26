import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import WatchClient from './WatchClient';
import { findMatch } from '@/lib/football-data';
import { COMPETITION_CODES } from '@/lib/competitions';
import { resolveChannels } from '@/lib/mapping';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const match = await findMatch(matchId, COMPETITION_CODES);
  if (!match) notFound();

  const resolved = await resolveChannels(match.competition).catch(() => []);

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <WatchClient match={match} resolved={resolved} />
      </main>
    </>
  );
}
