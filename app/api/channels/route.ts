import { NextRequest, NextResponse } from 'next/server';
import { getChannelList, searchChannels, toChannelInfo } from '@/lib/channels';

export const dynamic = 'force-dynamic';

/** GET /api/channels?q=dazn — search the IPTV playlist. Returns ids only, no stream URLs. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const channels = await getChannelList();
    return NextResponse.json({
      total: channels.length,
      channels: searchChannels(channels, q).map(toChannelInfo),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
