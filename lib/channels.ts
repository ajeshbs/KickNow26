import type { StoredChannel } from '@/types';
import { DOMESTIC_COUNTRY, COUNTRY_CODES } from './countries';
import { getCf } from './cf';

const CHANNELS_KEY = 'channels:v1';

export async function getChannels(): Promise<StoredChannel[]> {
  const { env } = getCf();
  const raw = await env.KICKNOW_KV.get(CHANNELS_KEY, 'text');
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as StoredChannel[]) : [];
  } catch {
    return [];
  }
}

export async function saveChannels(channels: StoredChannel[]): Promise<void> {
  const { env } = getCf();
  await env.KICKNOW_KV.put(CHANNELS_KEY, JSON.stringify(channels));
}

/**
 * Channels carrying a competition, domestic country first, then by the
 * COUNTRIES display order, preserving stored order within a country.
 */
export function channelsForCompetition(
  channels: StoredChannel[],
  compCode: string,
): StoredChannel[] {
  return sortByCountry(
    channels.filter((c) => c.url && c.competitions.includes(compCode)),
    DOMESTIC_COUNTRY[compCode],
  );
}

/** All channels with a URL, in COUNTRIES display order (watch-page fallback). */
export function activeChannels(channels: StoredChannel[]): StoredChannel[] {
  return sortByCountry(channels.filter((c) => c.url));
}

function sortByCountry(channels: StoredChannel[], domestic?: string): StoredChannel[] {
  const rank = (c: StoredChannel) => {
    if (domestic && c.country === domestic) return -1;
    const i = COUNTRY_CODES.indexOf(c.country);
    return i === -1 ? COUNTRY_CODES.length : i;
  };
  return [...channels].sort((a, b) => rank(a) - rank(b));
}
