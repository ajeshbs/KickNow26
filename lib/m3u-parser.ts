import type { Channel } from '@/types';

const SPORTS_M3U_URL = 'https://iptv-org.github.io/iptv/categories/sports.m3u';

const BLOCKED_KEYWORDS = [
  'geo-blocked', 'geoblocked', 'region locked',
  'beinsports', 'bein sports', 'sky sports', 'espn',
  'dazn', 'bt sport',
];

const PREFERRED_KEYWORDS = [
  'world cup', 'fifa', 'football', 'soccer', 'sport',
  'hd', 'fhd', 'uhd',
];

export async function fetchChannels(): Promise<Channel[]> {
  const res = await fetch(SPORTS_M3U_URL, {
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Failed to fetch M3U: ${res.status}`);

  const text = await res.text();
  return parseM3U(text);
}

export function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.split('\n');

  let currentMeta: Partial<Channel> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXTINF:')) {
      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      const nameMatch = trimmed.match(/,(.+)$/);

      currentMeta = {
        logo: logoMatch?.[1] || '',
        group: groupMatch?.[1] || 'Uncategorized',
        name: nameMatch?.[1]?.trim() || 'Unknown Channel',
      };
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (currentMeta.name && currentMeta.name !== 'Unknown Channel') {
        channels.push({
          name: currentMeta.name,
          url: trimmed,
          logo: currentMeta.logo || '',
          group: currentMeta.group || 'Uncategorized',
        });
      }
      currentMeta = {};
    }
  }

  return channels;
}

export function filterChannels(channels: Channel[]): Channel[] {
  const filtered = channels.filter((ch) => {
    const lower = ch.name.toLowerCase();
    const isBlocked = BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));
    return !isBlocked;
  });

  const preferred = filtered.filter((ch) => {
    const lower = ch.name.toLowerCase();
    return PREFERRED_KEYWORDS.some((kw) => lower.includes(kw));
  });

  const others = filtered.filter((ch) => {
    const lower = ch.name.toLowerCase();
    return !PREFERRED_KEYWORDS.some((kw) => lower.includes(kw));
  });

  preferred.sort((a, b) => a.name.localeCompare(b.name));
  others.sort((a, b) => a.name.localeCompare(b.name));

  return [...preferred, ...others];
}

export function getStreamUrl(url: string): string {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  return proxyUrl;
}
