import type { FdMatch, FdScorer, FdStanding, FdTeam } from '@/types';
import { MADRID_TEAM_ID } from './competitions';
import { cached } from './cache';
import { getCf } from './cf';

const BASE = 'https://api.football-data.org/v4';

async function fdFetch<T>(path: string): Promise<T> {
  const { env } = getCf();
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not configured');

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`football-data ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Mappers: normalize API payloads to slim shapes ─────────────────── */

interface ApiTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

function mapTeam(t: ApiTeam): FdTeam {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName || t.name,
    tla: t.tla || '',
    crest: t.crest || '',
  };
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: FdMatch['status'];
  matchday: number | null;
  stage: string | null;
  competition: { code: string; name: string };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

function mapMatch(m: ApiMatch): FdMatch {
  return {
    id: m.id,
    competition: m.competition.code,
    competitionName: m.competition.name,
    utcDate: m.utcDate,
    status: m.status,
    matchday: m.matchday,
    stage: m.stage,
    home: mapTeam(m.homeTeam),
    away: mapTeam(m.awayTeam),
    score: { home: m.score.fullTime.home, away: m.score.fullTime.away },
  };
}

/* ── Public cached accessors ────────────────────────────────────────── */

export async function getCompMatches(code: string): Promise<FdMatch[]> {
  const { env, ctx } = getCf();
  return cached(
    env.KICKNOW_KV,
    `fd:matches:${code}`,
    async () => {
      const data = await fdFetch<{ matches: ApiMatch[] }>(`/competitions/${code}/matches`);
      return data.matches.map(mapMatch);
    },
    { ttl: 600, swr: 3000 },
    ctx,
  );
}

export async function getMadridMatches(): Promise<FdMatch[]> {
  const { env, ctx } = getCf();
  return cached(
    env.KICKNOW_KV,
    `fd:matches:team:${MADRID_TEAM_ID}`,
    async () => {
      const data = await fdFetch<{ matches: ApiMatch[] }>(
        `/teams/${MADRID_TEAM_ID}/matches?limit=100`,
      );
      return data.matches.map(mapMatch);
    },
    { ttl: 300, swr: 3300 },
    ctx,
  );
}

interface ApiStandingsResponse {
  standings: Array<{
    type: string;
    group: string | null;
    table: Array<{
      position: number;
      team: ApiTeam;
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
    }>;
  }>;
}

export async function getStandings(code: string): Promise<FdStanding[]> {
  const { env, ctx } = getCf();
  return cached(
    env.KICKNOW_KV,
    `fd:standings:${code}`,
    async () => {
      const data = await fdFetch<ApiStandingsResponse>(`/competitions/${code}/standings`);
      return data.standings
        .filter((s) => s.type === 'TOTAL')
        .flatMap((s) =>
          s.table.map((row) => ({
            group: s.group,
            position: row.position,
            team: mapTeam(row.team),
            played: row.playedGames,
            won: row.won,
            drawn: row.draw,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
          })),
        );
    },
    { ttl: 3600, swr: 18000 },
    ctx,
  );
}

interface ApiScorersResponse {
  scorers: Array<{
    player: { name: string };
    team: ApiTeam;
    goals: number;
    assists: number | null;
    penalties: number | null;
  }>;
}

export async function getScorers(code: string): Promise<FdScorer[]> {
  const { env, ctx } = getCf();
  return cached(
    env.KICKNOW_KV,
    `fd:scorers:${code}`,
    async () => {
      const data = await fdFetch<ApiScorersResponse>(`/competitions/${code}/scorers?limit=20`);
      return data.scorers.map((s) => ({
        name: s.player.name,
        team: mapTeam(s.team),
        goals: s.goals,
        assists: s.assists,
        penalties: s.penalties,
      }));
    },
    { ttl: 21600, swr: 64800 },
    ctx,
  );
}

/** Find one match by id across all cached lists; falls back to the API. */
export async function findMatch(id: number, codes: string[]): Promise<FdMatch | null> {
  const madrid = await getMadridMatches().catch(() => [] as FdMatch[]);
  const fromMadrid = madrid.find((m) => m.id === id);
  if (fromMadrid) return fromMadrid;

  for (const code of codes) {
    const matches = await getCompMatches(code).catch(() => [] as FdMatch[]);
    const found = matches.find((m) => m.id === id);
    if (found) return found;
  }

  try {
    const data = await fdFetch<ApiMatch>(`/matches/${id}`);
    return mapMatch(data);
  } catch {
    return null;
  }
}
