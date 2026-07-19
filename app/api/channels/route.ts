import { NextRequest, NextResponse } from 'next/server';
import { getChannels, saveChannels } from '@/lib/channels';
import { COUNTRY_CODES } from '@/lib/countries';
import { CHANNEL_TAG_CODES } from '@/lib/competitions';
import type { StoredChannel } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/channels — the owner's stored channel list (site is TOTP-gated). */
export async function GET() {
  return NextResponse.json({ channels: await getChannels() });
}

const MAX_CHANNELS = 100;

/** PUT /api/channels — replace the stored channel list. */
export async function PUT(request: NextRequest) {
  let body: { channels?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!Array.isArray(body.channels)) {
    return NextResponse.json({ error: 'channels must be an array' }, { status: 400 });
  }

  const clean: StoredChannel[] = [];
  for (const raw of body.channels.slice(0, MAX_CHANNELS)) {
    const ch = raw as Partial<StoredChannel> | null;
    if (!ch || typeof ch.name !== 'string' || typeof ch.url !== 'string') continue;
    const name = ch.name.trim();
    const url = ch.url.trim();
    // Empty url is allowed — a preset waiting for its link; skipped on the watch page.
    if (!name || (url && !/^https?:\/\//i.test(url))) continue;
    clean.push({
      id: typeof ch.id === 'string' && ch.id ? ch.id : crypto.randomUUID(),
      name,
      country:
        typeof ch.country === 'string' && COUNTRY_CODES.includes(ch.country)
          ? ch.country
          : 'OTHER',
      url,
      competitions: Array.isArray(ch.competitions)
        ? ch.competitions.filter(
            (c): c is string => typeof c === 'string' && CHANNEL_TAG_CODES.includes(c),
          )
        : [],
      proxySegments: Boolean(ch.proxySegments),
    });
  }

  await saveChannels(clean);
  return NextResponse.json({ ok: true, count: clean.length });
}
