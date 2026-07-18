import { NextRequest, NextResponse } from 'next/server';
import { getCompMatches, getMadridMatches } from '@/lib/football-data';
import { COMPETITION_CODES, getCompetition, MADRID_TEAM_ID } from '@/lib/competitions';
import type { FdMatch } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/fixtures?comp=PD    → one competition's matches
 * GET /api/fixtures?team=86    → Real Madrid matches (any team param → 86)
 * GET /api/fixtures?scope=today → today's matches across all leagues + Madrid, deduped
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const comp = searchParams.get('comp');
  const team = searchParams.get('team');
  const scope = searchParams.get('scope');

  try {
    if (team) {
      if (Number(team) !== MADRID_TEAM_ID) {
        return NextResponse.json({ error: 'Unknown team' }, { status: 400 });
      }
      return NextResponse.json({ matches: await getMadridMatches() });
    }

    if (comp) {
      if (!getCompetition(comp)) {
        return NextResponse.json({ error: 'Unknown competition' }, { status: 400 });
      }
      return NextResponse.json({ matches: await getCompMatches(comp.toUpperCase()) });
    }

    if (scope === 'today') {
      const lists = await Promise.all([
        getMadridMatches().catch(() => [] as FdMatch[]),
        ...COMPETITION_CODES.map((c) => getCompMatches(c).catch(() => [] as FdMatch[])),
      ]);
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

      const byId = new Map<number, FdMatch>();
      for (const list of lists) {
        for (const m of list) {
          const d = new Date(m.utcDate);
          if (d >= dayStart && d <= dayEnd && !byId.has(m.id)) byId.set(m.id, m);
        }
      }
      const matches = [...byId.values()].sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
      );
      return NextResponse.json({ matches });
    }

    return NextResponse.json({ error: 'Missing comp, team, or scope param' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
