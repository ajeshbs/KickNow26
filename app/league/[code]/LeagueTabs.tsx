'use client';

import { useState } from 'react';
import StandingsTable from '@/components/StandingsTable';
import ScorersList from '@/components/ScorersList';
import type { FdScorer, FdStanding } from '@/types';

type Tab = 'standings' | 'scorers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'scorers', label: 'Scorers' },
];

export default function LeagueTabs({
  standings,
  scorers,
}: {
  standings: FdStanding[];
  scorers: FdScorer[];
}) {
  const [tab, setTab] = useState<Tab>('standings');

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

      {tab === 'standings' && <StandingsTable standings={standings} />}
      {tab === 'scorers' && <ScorersList scorers={scorers} />}
    </div>
  );
}
