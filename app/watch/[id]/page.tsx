import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import WatchClient from './WatchClient';
import { findMatch } from '@/lib/football-data';
import { COMPETITION_CODES } from '@/lib/competitions';
import { getChannels, channelsForCompetition, activeChannels } from '@/lib/channels';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const match = await findMatch(matchId, COMPETITION_CODES);
  if (!match) notFound();

  const [all, config] = await Promise.all([
    getChannels().catch(() => []),
    getConfig().catch(() => null),
  ]);
  // Cup/CWC matches have no tagged channels — fall back to every active channel.
  const tagged = channelsForCompetition(all, match.competition);
  const channels = tagged.length > 0 ? tagged : activeChannels(all);
  const proxy = config?.streamProxyUrl
    ? { url: config.streamProxyUrl, token: config.streamProxyToken }
    : null;

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <WatchClient match={match} channels={channels} proxy={proxy} />
      </main>
    </>
  );
}
