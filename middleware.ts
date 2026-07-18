import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

function getAuthSecret(): string | undefined {
  // Worker runtime: nodejs_compat_populate_process_env fills process.env.
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // next dev: middleware sandbox doesn't get .dev.vars via process.env.
  try {
    return (getCloudflareContext().env as { AUTH_SECRET?: string }).AUTH_SECRET;
  } catch {
    return undefined;
  }
}

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/favicon.ico', '/robots.txt'];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function withNoindex(res: NextResponse): NextResponse {
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res;
}

export async function middleware(request: NextRequest) {
  if ((process.env.MAINTENANCE_MODE as string | undefined) === 'true') {
    return withNoindex(
      new NextResponse('<!DOCTYPE html><html><body style="background:#0a1033;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><p>Temporarily unavailable.</p></body></html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );
  }

  const { pathname } = request.nextUrl;
  const secret = getAuthSecret();

  // Without AUTH_SECRET configured, fail closed (except public paths).
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = secret ? await verifySession(secret, token) : false;

  if (pathname === '/login' && authed) {
    const to = request.nextUrl.searchParams.get('to') || '/';
    const url = request.nextUrl.clone();
    url.pathname = to.startsWith('/') ? to : '/';
    url.search = '';
    return withNoindex(NextResponse.redirect(url));
  }

  if (!isPublic(pathname) && !authed) {
    if (pathname.startsWith('/api/')) {
      return withNoindex(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('to', pathname);
    return withNoindex(NextResponse.redirect(url));
  }

  return withNoindex(NextResponse.next());
}

export const config = {
  matcher: '/:path*',
};
