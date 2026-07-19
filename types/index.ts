/** One hand-picked IPTV channel, stored in KV under channels:v1. */
export interface StoredChannel {
  id: string;
  name: string; // e.g. "beIN Sports 1 FR"
  country: string; // ES | UK | US | DE | FR | IT | OTHER
  url: string; // direct stream URL (usually .m3u8)
  competitions: string[]; // competition codes this channel carries
  proxySegments?: boolean; // route media segments through the Worker (token/CORS workaround)
}

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FdMatch {
  id: number;
  competition: string; // competition code, e.g. "PD"
  competitionName: string;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  stage: string | null;
  home: FdTeam;
  away: FdTeam;
  score: {
    home: number | null;
    away: number | null;
  };
}

export interface FdStanding {
  group: string | null; // for CL group/league phase
  position: number;
  team: FdTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface FdScorer {
  name: string;
  team: FdTeam;
  goals: number;
  assists: number | null;
  penalties: number | null;
}
