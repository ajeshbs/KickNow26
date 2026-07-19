import Navigation from '@/components/Navigation';
import TvClient from './TvClient';
import { getChannels, channelsForCompetition } from '@/lib/channels';
import { RMTV_CODE } from '@/lib/competitions';

export const dynamic = 'force-dynamic';

export default async function TvPage() {
  const all = await getChannels().catch(() => []);
  const channels = channelsForCompetition(all, RMTV_CODE);

  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <header>
          <h1 className="text-lg font-bold text-white">
            Real Madrid <span className="text-gold-300">TV</span>
          </h1>
          <p className="text-xs text-white/40">24/7 club channel</p>
        </header>
        <TvClient channels={channels} />
      </main>
    </>
  );
}
