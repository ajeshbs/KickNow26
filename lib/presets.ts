// Client-safe suggested-channel presets (2025-26 season rights holders),
// Madrid scope: La Liga (PD), Champions League (CL), Real Madrid TV (RMTV).
// URL is left empty — the owner pastes their IPTV link per channel in /settings.

export interface ChannelPreset {
  name: string;
  country: string;
  competitions: string[];
}

export const SUGGESTED_CHANNELS: ChannelPreset[] = [
  // ── Club channel ──
  { name: 'Real Madrid TV', country: 'ES', competitions: ['RMTV'] },

  // ── Spain ──
  { name: 'M+ LALIGA TV', country: 'ES', competitions: ['PD'] },
  { name: 'DAZN LaLiga', country: 'ES', competitions: ['PD'] },
  { name: 'M+ Liga de Campeones', country: 'ES', competitions: ['CL'] },

  // ── UK ──
  { name: 'Premier Sports 1', country: 'UK', competitions: ['PD'] },
  { name: 'Premier Sports 2', country: 'UK', competitions: ['PD'] },
  { name: 'TNT Sports 1', country: 'UK', competitions: ['CL'] },
  { name: 'TNT Sports 2', country: 'UK', competitions: ['CL'] },
  { name: 'TNT Sports 3', country: 'UK', competitions: ['CL'] },

  // ── Germany ──
  { name: 'DAZN 1 DE', country: 'DE', competitions: ['PD', 'CL'] },
  { name: 'DAZN 2 DE', country: 'DE', competitions: ['CL'] },

  // ── France ──
  { name: 'beIN Sports 1 FR', country: 'FR', competitions: ['PD'] },
  { name: 'beIN Sports 2 FR', country: 'FR', competitions: ['PD'] },
  { name: 'beIN Sports 3 FR', country: 'FR', competitions: ['PD'] },
  { name: 'Canal+ Foot', country: 'FR', competitions: ['CL'] },
  { name: 'Canal+ Sport 360', country: 'FR', competitions: ['CL'] },

  // ── Italy ──
  { name: 'Sky Sport Uno IT', country: 'IT', competitions: ['CL'] },

  // ── USA ──
  { name: 'ESPN Deportes', country: 'US', competitions: ['PD'] },
  { name: 'CBS Sports Network', country: 'US', competitions: ['CL'] },
  { name: 'TUDN', country: 'US', competitions: ['CL'] },
];
