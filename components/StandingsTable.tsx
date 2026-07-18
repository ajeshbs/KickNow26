import type { FdStanding } from '@/types';
import { MADRID_TEAM_ID } from '@/lib/competitions';

function Crest({ src }: { src: string }) {
  if (!src) return <span className="inline-block h-5 w-5 rounded-full bg-white/10" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="inline-block h-5 w-5 object-contain" loading="lazy" />;
}

export default function StandingsTable({ standings }: { standings: FdStanding[] }) {
  if (standings.length === 0) {
    return <p className="py-8 text-center text-sm text-white/40">No standings available.</p>;
  }

  const groups = new Map<string, FdStanding[]>();
  for (const row of standings) {
    const g = row.group ?? '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(row);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([group, rows]) => (
        <div key={group} className="overflow-x-auto rounded-xl border border-white/10">
          {group && (
            <h3 className="border-b border-white/10 bg-navy-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gold-300">
              {group.replace(/_/g, ' ')}
            </h3>
          )}
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-navy-900 text-left text-xs uppercase text-white/40">
                <th className="px-3 py-2 w-8">#</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-2 py-2 text-center">P</th>
                <th className="px-2 py-2 text-center">W</th>
                <th className="px-2 py-2 text-center">D</th>
                <th className="px-2 py-2 text-center">L</th>
                <th className="px-2 py-2 text-center">GD</th>
                <th className="px-3 py-2 text-center font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMadrid = row.team.id === MADRID_TEAM_ID;
                return (
                  <tr
                    key={row.team.id}
                    className={`border-t border-white/5 ${
                      isMadrid ? 'bg-gold-400/10' : 'odd:bg-navy-950 even:bg-navy-900/50'
                    }`}
                  >
                    <td className="px-3 py-2 text-white/50">{row.position}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <Crest src={row.team.crest} />
                        <span className={isMadrid ? 'font-semibold text-gold-300' : 'text-white'}>
                          {row.team.shortName}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center text-white/60">{row.played}</td>
                    <td className="px-2 py-2 text-center text-white/60">{row.won}</td>
                    <td className="px-2 py-2 text-center text-white/60">{row.drawn}</td>
                    <td className="px-2 py-2 text-center text-white/60">{row.lost}</td>
                    <td className="px-2 py-2 text-center text-white/60">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-white">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
