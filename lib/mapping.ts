import type { Channel, ChannelMapping, MappedChannel } from '@/types';
import { getCf } from './cf';
import { getChannelList, type IdChannel } from './channels';

const MAP_KEY = 'map:v1';

export function emptyMapping(): ChannelMapping {
  return { updatedAt: 0, competitions: {} };
}

export async function getMapping(): Promise<ChannelMapping> {
  const { env } = getCf();
  const raw = await env.KICKNOW_KV.get(MAP_KEY, 'text');
  if (!raw) return emptyMapping();
  try {
    return JSON.parse(raw) as ChannelMapping;
  } catch {
    return emptyMapping();
  }
}

export async function saveMapping(mapping: ChannelMapping): Promise<void> {
  const { env } = getCf();
  mapping.updatedAt = Date.now();
  await env.KICKNOW_KV.put(MAP_KEY, JSON.stringify(mapping));
}

export interface ResolvedChannel {
  pin: MappedChannel;
  channel: Channel | null; // null → unresolvable with current playlist
}

/**
 * Resolve the pinned channels for a competition against the current playlist.
 * Falls back to exact-name match if the stable id no longer resolves.
 */
export async function resolveChannels(compCode: string): Promise<ResolvedChannel[]> {
  const [mapping, channels] = await Promise.all([getMapping(), getChannelList()]);
  const pins = mapping.competitions[compCode] || [];
  if (pins.length === 0) return [];

  const byId = new Map<string, IdChannel>();
  const byName = new Map<string, IdChannel>();
  for (const ch of channels) {
    byId.set(ch.id, ch);
    if (!byName.has(ch.name)) byName.set(ch.name, ch);
  }

  return pins.map((pin) => {
    const found = byId.get(pin.id) ?? byName.get(pin.name) ?? null;
    return {
      pin,
      channel: found
        ? { name: found.name, url: found.url, logo: found.logo, group: found.group }
        : null,
    };
  });
}
