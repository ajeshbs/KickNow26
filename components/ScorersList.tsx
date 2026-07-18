import type { FdScorer } from '@/types';

function Crest({ src }: { src: string }) {
  if (!src) return <span className="inline-block h-5 w-5 rounded-full bg-white/10" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="inline-block h-5 w-5 object-contain" loading="lazy" />;
}

export default function ScorersList({ scorers }: { scorers: FdScorer[] }) {
  if (scorers.length === 0) {
    return <p className="py-8 text-center text-sm text-white/40">No scorer data available.</p>;
  }

  const max = scorers[0]?.goals || 1;

  return (
    <ol className="flex flex-col gap-1.5">
      {scorers.map((s, i) => (
        <li
          key={`${s.name}-${s.team.id}`}
          className="relative overflow-hidden rounded-lg border border-white/10 bg-navy-900 px-4 py-2.5"
        >
          <span
            className="absolute inset-y-0 left-0 bg-gold-400/10"
            style={{ width: `${(s.goals / max) * 100}%` }}
          />
          <span className="relative flex items-center gap-3">
            <span className={`w-6 text-sm font-bold ${i < 3 ? 'text-gold-300' : 'text-white/40'}`}>
              {i + 1}
            </span>
            <Crest src={s.team.crest} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white">{s.name}</span>
              <span className="block truncate text-xs text-white/40">{s.team.shortName}</span>
            </span>
            <span className="text-sm font-bold text-white">{s.goals}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
