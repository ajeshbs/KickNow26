import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import WatchClient from './WatchClient';
import { findMatch } from '@/lib/football-data';
import { COMPETITION_CODES } from '@/lib/competitions';
import { getChannels, channelsForCompetition } from '@/lib/channels';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const match = await findMatch(matchId, COMPETITION_CODES);
  if (!match) notFound();

  const all = await getChannels().catch(() => []);
  const channels = channelsForCompetition(all, match.competition);

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <WatchClient match={match} channels={channels} />
      </main>
    </>
  );
}
