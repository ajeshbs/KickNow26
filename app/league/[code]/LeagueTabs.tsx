'use client';

import { useState } from 'react';
import FixtureList from '@/components/FixtureList';
import StandingsTable from '@/components/StandingsTable';
import ScorersList from '@/components/ScorersList';
import { isLive, isUpcoming } from '@/lib/competitions';
import type { FdMatch, FdScorer, FdStanding } from '@/types';

type Tab = 'fixtures' | 'results' | 'standings' | 'scorers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'results', label: 'Results' },
  { id: 'standings', label: 'Standings' },
  { id: 'scorers', label: 'Scorers' },
];

export default function LeagueTabs({
  matches,
  standings,
  scorers,
}: {
  matches: FdMatch[];
  standings: FdStanding[];
  scorers: FdScorer[];
}) {
  const [tab, setTab] = useState<Tab>('fixtures');

  const fixtures = matches
    .filter((m) => isUpcoming(m.status) || isLive(m.status))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 30);
  const results = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 30);

  return (
    <div>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-navy-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === t.id ? 'bg-gold-400/15 font-semibold text-gold-300' : 'text-white/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fixtures' && <FixtureList matches={fixtures} />}
      {tab === 'results' && <FixtureList matches={results} />}
      {tab === 'standings' && <StandingsTable standings={standings} />}
      {tab === 'scorers' && <ScorersList scorers={scorers} />}
    </div>
  );
}
