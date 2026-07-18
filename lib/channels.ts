import type { Channel, ChannelInfo } from '@/types';
import { parseM3U } from './m3u-parser';
import { cached } from './cache';
import { getCf } from './cf';

/**
 * Stable channel id derived from name+group so pins survive provider
 * URL/token rotation. SHA-1 truncated to 12 hex chars.
 */
export async function channelId(name: string, group: string): Promise<string> {
  const data = new TextEncoder().encode(`${name}|${group}`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', data));
  return Array.from(hash.slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface IdChannel extends Channel {
  id: string;
}

export async function getChannelList(): Promise<IdChannel[]> {
  const { env, ctx } = getCf();
  const url = env.IPTV_M3U_URL;
  if (!url) throw new Error('IPTV_M3U_URL is not configured');

  return cached(
    env.KICKNOW_KV,
    'iptv:channels',
    async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`IPTV playlist fetch failed: ${res.status}`);
      const channels = parseM3U(await res.text());
      return Promise.all(
        channels.map(async (ch) => ({ ...ch, id: await channelId(ch.name, ch.group) })),
      );
    },
    { ttl: 21600, swr: 64800 },
    ctx,
  );
}

export function toChannelInfo(ch: IdChannel): ChannelInfo {
  return { id: ch.id, name: ch.name, logo: ch.logo, group: ch.group };
}

export function searchChannels(channels: IdChannel[], query: string, limit = 50): IdChannel[] {
  const q = query.trim().toLowerCase();
  if (!q) return channels.slice(0, limit);
  const terms = q.split(/\s+/);
  return channels
    .filter((ch) => {
      const hay = `${ch.name} ${ch.group}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, limit);
}
