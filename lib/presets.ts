// Client-safe suggested-channel presets (2025-26 season rights holders).
// URL is left empty — the owner pastes their IPTV link per channel in /settings.

export interface ChannelPreset {
  name: string;
  country: string;
  competitions: string[]; // PD, PL, BL1, SA, FL1, CL
}

export const SUGGESTED_CHANNELS: ChannelPreset[] = [
  // ── Spain ──
  { name: 'M+ LALIGA TV', country: 'ES', competitions: ['PD'] },
  { name: 'DAZN LaLiga', country: 'ES', competitions: ['PD'] },
  { name: 'M+ Liga de Campeones', country: 'ES', competitions: ['CL'] },
  { name: 'M+ Vamos', country: 'ES', competitions: ['BL1'] },

  // ── UK ──
  { name: 'Sky Sports Premier League', country: 'UK', competitions: ['PL'] },
  { name: 'Sky Sports Main Event', country: 'UK', competitions: ['PL'] },
  { name: 'Sky Sports Football', country: 'UK', competitions: ['PL', 'BL1'] },
  { name: 'TNT Sports 1', country: 'UK', competitions: ['PL', 'CL', 'SA'] },
  { name: 'TNT Sports 2', country: 'UK', competitions: ['CL', 'SA'] },
  { name: 'TNT Sports 3', country: 'UK', competitions: ['CL'] },
  { name: 'Premier Sports 1', country: 'UK', competitions: ['PD'] },
  { name: 'Premier Sports 2', country: 'UK', competitions: ['PD'] },

  // ── Germany ──
  { name: 'Sky Sport Bundesliga 1', country: 'DE', competitions: ['BL1'] },
  { name: 'Sky Sport Top Event DE', country: 'DE', competitions: ['BL1', 'PL'] },
  { name: 'DAZN 1 DE', country: 'DE', competitions: ['BL1', 'CL', 'PD', 'SA'] },
  { name: 'DAZN 2 DE', country: 'DE', competitions: ['CL', 'FL1'] },

  // ── France ──
  { name: 'Ligue 1+', country: 'FR', competitions: ['FL1'] },
  { name: 'beIN Sports 1 FR', country: 'FR', competitions: ['FL1', 'PD', 'BL1'] },
  { name: 'beIN Sports 2 FR', country: 'FR', competitions: ['PD', 'BL1'] },
  { name: 'beIN Sports 3 FR', country: 'FR', competitions: ['PD', 'SA'] },
  { name: 'Canal+ Foot', country: 'FR', competitions: ['PL', 'CL'] },
  { name: 'Canal+ Sport 360', country: 'FR', competitions: ['CL', 'FL1'] },

  // ── Italy ──
  { name: 'DAZN 1 IT', country: 'IT', competitions: ['SA'] },
  { name: 'Sky Sport Calcio', country: 'IT', competitions: ['SA'] },
  { name: 'Sky Sport Uno IT', country: 'IT', competitions: ['SA', 'CL'] },

  // ── USA ──
  { name: 'USA Network', country: 'US', competitions: ['PL'] },
  { name: 'NBC Sports', country: 'US', competitions: ['PL'] },
  { name: 'beIN Sports US', country: 'US', competitions: ['FL1'] },
  { name: 'ESPN Deportes', country: 'US', competitions: ['PD', 'BL1'] },
  { name: 'CBS Sports Network', country: 'US', competitions: ['CL'] },
  { name: 'CBS Sports Golazo', country: 'US', competitions: ['SA'] },
  { name: 'TUDN', country: 'US', competitions: ['CL'] },
];
