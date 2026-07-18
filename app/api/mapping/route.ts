import { NextRequest, NextResponse } from 'next/server';
import { getMapping, saveMapping } from '@/lib/mapping';
import { COMPETITION_CODES } from '@/lib/competitions';
import type { ChannelMapping, MappedChannel } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getMapping());
}

export async function PUT(request: NextRequest) {
  let body: ChannelMapping;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!body || typeof body.competitions !== 'object' || body.competitions === null) {
    return NextResponse.json({ error: 'Invalid mapping' }, { status: 400 });
  }

  const clean: ChannelMapping = { updatedAt: 0, competitions: {} };
  for (const code of COMPETITION_CODES) {
    const pins = body.competitions[code];
    if (!Array.isArray(pins)) continue;
    clean.competitions[code] = pins
      .filter((p): p is MappedChannel => Boolean(p && typeof p.id === 'string' && typeof p.name === 'string'))
      .slice(0, 20)
      .map((p) => ({ id: p.id, name: p.name, label: String(p.label ?? '') }));
  }

  await saveMapping(clean);
  return NextResponse.json({ ok: true });
}
