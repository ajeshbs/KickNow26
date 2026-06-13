import { NextResponse } from 'next/server';
import { fetchChannels, filterChannels } from '@/lib/m3u-parser';
import type { Channel } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const KNOWN_CHANNELS: Channel[] = [
  {
    name: 'Live Stream 1',
    url: 'http://4e87b8a2.rossteleccom.net/iptv/UWSCNHYFPPFSA5/545/7322/index.m3u8',
    logo: 'https://github.com/SKS-WEBDEV/KickNow26/blob/7d3d7fbd1ca2d578626806ee15b710178536936e/public/live.png',
    group: 'Live',
  },
  {
    name: 'Live Stream 2',
    url: 'http://38b891c9.rossteleccom.net/iptv/4HP7GES799X3WU/7323/index.m3u8',
    logo: 'https://github.com/SKS-WEBDEV/KickNow26/blob/7d3d7fbd1ca2d578626806ee15b710178536936e/public/live.png',
    group: 'Live',
  },
  {
    name: 'DD Sports SD (1080p)',
    url: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8',
    logo: 'https://dtil.tmsimg.com/assets/s158255_ld_h15_aa.png?lock=720x540',
    group: 'Sports',
  },
];

export async function GET() {
  try {
    const allChannels = await fetchChannels();
    const filtered = filterChannels(allChannels);

    const knownUrls = new Set(KNOWN_CHANNELS.map((c) => c.url));
    const deduped = filtered.filter((c) => !knownUrls.has(c.url));

    const combined = [...KNOWN_CHANNELS, ...deduped].slice(0, 50);

    return NextResponse.json({
      total: combined.length,
      channels: combined,
    });
  } catch (error) {
    return NextResponse.json(
      { channels: KNOWN_CHANNELS, total: KNOWN_CHANNELS.length, source: 'fallback' },
      { status: 200 }
    );
  }
}
