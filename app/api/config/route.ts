import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig, type AppConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getConfig());
}

export async function PUT(request: NextRequest) {
  let body: Partial<AppConfig>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const url = typeof body.streamProxyUrl === 'string' ? body.streamProxyUrl.trim().replace(/\/+$/, '') : '';
  if (url && !/^https:\/\//i.test(url)) {
    return NextResponse.json(
      { error: 'Proxy URL must be https:// (http would be blocked as mixed content)' },
      { status: 400 },
    );
  }

  await saveConfig({
    streamProxyUrl: url,
    streamProxyToken: typeof body.streamProxyToken === 'string' ? body.streamProxyToken.trim() : '',
  });
  return NextResponse.json({ ok: true });
}
