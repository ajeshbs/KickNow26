import { NextRequest, NextResponse } from 'next/server';
import { verifyTotp } from '@/lib/totp';
import { createSession, SESSION_COOKIE } from '@/lib/session';
import { getCf } from '@/lib/cf';

export const dynamic = 'force-dynamic';

const MAX_FAILS = 5;
const LOCKOUT_TTL = 900; // 15 minutes
const REMEMBER_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const SHORT_MS = 12 * 60 * 60 * 1000; // 12 hours

interface FailState {
  fails: number;
}

export async function POST(request: NextRequest) {
  const { env } = getCf();
  const kv = env.KICKNOW_KV;

  if (!env.TOTP_SECRET || !env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  let body: { code?: string; remember?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const code = String(body.code ?? '').trim();
  const remember = Boolean(body.remember);

  // Rate limit: global key (single-user site) + per-IP key.
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rlKeys = ['rl:auth', `rl:auth:${ip}`];
  for (const key of rlKeys) {
    const state = await kv.get<FailState>(key, 'json');
    if (state && state.fails >= MAX_FAILS) {
      return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });
    }
  }

  const matchedCounter = await verifyTotp(env.TOTP_SECRET, code);

  if (matchedCounter === null) {
    for (const key of rlKeys) {
      const state = (await kv.get<FailState>(key, 'json')) ?? { fails: 0 };
      await kv.put(key, JSON.stringify({ fails: state.fails + 1 }), {
        expirationTtl: LOCKOUT_TTL,
      });
    }
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
  }

  // Replay prevention: a code (counter) can only be used once.
  const lastCtr = Number((await kv.get('auth:lastctr', 'text')) ?? 0);
  if (matchedCounter <= lastCtr) {
    return NextResponse.json({ error: 'Code already used. Wait for the next one.' }, { status: 401 });
  }
  await kv.put('auth:lastctr', String(matchedCounter), { expirationTtl: 300 });

  for (const key of rlKeys) await kv.delete(key);

  const expiresAt = Date.now() + (remember ? REMEMBER_MS : SHORT_MS);
  const token = await createSession(env.AUTH_SECRET, expiresAt);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: REMEMBER_MS / 1000 } : {}),
  });
  return res;
}
