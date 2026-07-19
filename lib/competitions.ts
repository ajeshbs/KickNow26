export interface Competition {
  code: string;
  name: string;
  shortName: string;
  emblem: string;
}

// Madrid-only scope: the two competitions with full football-data coverage.
// Madrid's other matches (Copa, Supercopa, CWC) still appear via the team feed.
export const COMPETITIONS: Competition[] = [
  { code: 'PD', name: 'La Liga', shortName: 'La Liga', emblem: 'https://crests.football-data.org/PD.png' },
  { code: 'CL', name: 'Champions League', shortName: 'UCL', emblem: 'https://crests.football-data.org/CL.png' },
];

export const COMPETITION_CODES = COMPETITIONS.map((c) => c.code);

export function getCompetition(code: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.code === code.toUpperCase());
}

export const RMTV_CODE = 'RMTV';

/** Tags assignable to channels in settings: competitions + Real Madrid TV. */
export const CHANNEL_TAGS = [
  ...COMPETITIONS.map((c) => ({ code: c.code, label: c.shortName })),
  { code: RMTV_CODE, label: 'RM TV' },
];

export const CHANNEL_TAG_CODES = CHANNEL_TAGS.map((t) => t.code);

export const MADRID_TEAM_ID = 86;

export const LIVE_STATUSES = ['IN_PLAY', 'PAUSED'] as const;
export const UPCOMING_STATUSES = ['SCHEDULED', 'TIMED'] as const;

export function isLive(status: string): boolean {
  return status === 'IN_PLAY' || status === 'PAUSED';
}

export function isUpcoming(status: string): boolean {
  return status === 'SCHEDULED' || status === 'TIMED';
}
