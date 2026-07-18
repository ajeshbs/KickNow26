import type { Channel } from '@/types';

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
