export interface Competition {
  code: string;
  name: string;
  shortName: string;
  emblem: string;
}

export const COMPETITIONS: Competition[] = [
  { code: 'PD', name: 'La Liga', shortName: 'La Liga', emblem: 'https://crests.football-data.org/PD.png' },
  { code: 'PL', name: 'Premier League', shortName: 'EPL', emblem: 'https://crests.football-data.org/PL.png' },
  { code: 'BL1', name: 'Bundesliga', shortName: 'BL', emblem: 'https://crests.football-data.org/BL1.png' },
  { code: 'SA', name: 'Serie A', shortName: 'SA', emblem: 'https://crests.football-data.org/SA.png' },
  { code: 'FL1', name: 'Ligue 1', shortName: 'L1', emblem: 'https://crests.football-data.org/FL1.png' },
  { code: 'CL', name: 'Champions League', shortName: 'UCL', emblem: 'https://crests.football-data.org/CL.png' },
];

export const COMPETITION_CODES = COMPETITIONS.map((c) => c.code);

export function getCompetition(code: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.code === code.toUpperCase());
}

export const MADRID_TEAM_ID = 86;

export const LIVE_STATUSES = ['IN_PLAY', 'PAUSED'] as const;
export const UPCOMING_STATUSES = ['SCHEDULED', 'TIMED'] as const;

export function isLive(status: string): boolean {
  return status === 'IN_PLAY' || status === 'PAUSED';
}

export function isUpcoming(status: string): boolean {
  return status === 'SCHEDULED' || status === 'TIMED';
}
