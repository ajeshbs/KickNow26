export interface Channel {
  name: string;
  url: string;
  logo: string;
  group: string;
}

/** Channel as exposed to the settings UI — no stream URL. */
export interface ChannelInfo {
  id: string;
  name: string;
  logo: string;
  group: string;
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

/** One pinned channel inside the competition→channels mapping. */
export interface MappedChannel {
  id: string; // stable channel id (hash of name|group)
  name: string; // snapshot for display + fuzzy fallback
  label: string; // owner-entered broadcaster/country tag, e.g. "Spain"
}

export interface ChannelMapping {
  updatedAt: number;
  competitions: Record<string, MappedChannel[]>;
}
