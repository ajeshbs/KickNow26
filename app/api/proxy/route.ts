import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function isM3uUrl(url: string): boolean {
  const ext = url.split('?')[0].toLowerCase();
  return ext.endsWith('.m3u8') || ext.endsWith('.m3u');
}

async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location) {
        try { return new URL(location, url).href; } catch { return location; }
      }
    }
  } catch {}
  return url;
}

export async function OPTIONS() {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  h.set('Access-Control-Max-Age', '86400');
  return new NextResponse(null, { status: 204, headers: h });
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(urlParam);
    const resolveOnly = request.nextUrl.searchParams.get('resolve') === '1';

    const needsRedirectCheck = resolveOnly || isM3uUrl(decodedUrl);
    const finalUrl = needsRedirectCheck ? await resolveRedirect(decodedUrl) : decodedUrl;

    if (resolveOnly) {
      return NextResponse.json({ url: finalUrl, redirected: finalUrl !== decodedUrl });
    }

    const targetUrl = finalUrl !== decodedUrl ? finalUrl : decodedUrl;
    const clientCookies = request.headers.get('cookie');
    const referer = request.headers.get('referer') || `${BASE_URL}/`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': referer,
        ...(clientCookies ? { 'Cookie': clientCookies } : {}),
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Stream fetch failed: ${response.status}` }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const isM3u = isM3uUrl(decodedUrl) || contentType.toLowerCase().includes('mpegurl') || contentType.toLowerCase().includes('x-mpegurl');

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', isM3u ? 'application/vnd.apple.mpegurl' : contentType);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) responseHeaders.set('Set-Cookie', setCookie);

    if (isM3u) {
      const text = await response.text();
      const baseForRelative = targetUrl;
      const proxyWrap = (u: string) => `/api/proxy?url=${encodeURIComponent(u)}`;
      const isHttps = (s: string) => s.startsWith('https://') || s.startsWith('//');
      const isHttp = (s: string) => s.startsWith('http://');
      const isPlaylist = (s: string) => /\.m3u8?\b/i.test(s.split('?')[0]);
      const rewritten = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (trimmed === '') return line;

        if (trimmed.startsWith('#')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_, url) => {
            if (isHttps(url)) return `URI="${url}"`;
            if (isHttp(url)) return `URI="${proxyWrap(url)}"`;
            try {
              const abs = new URL(url, baseForRelative).href;
              if (isPlaylist(abs)) return `URI="${proxyWrap(abs)}"`;
              if (isHttp(abs)) return `URI="${proxyWrap(abs)}"`;
              return `URI="${abs}"`;
            } catch { return `URI="${proxyWrap(url)}"`; }
          });
        }

        if (isHttps(trimmed)) return line;

        if (isHttp(trimmed)) {
          const indent = line.match(/^\s*/)?.[0] || '';
          return `${indent}${proxyWrap(trimmed)}`;
        }

        try {
          const absoluteUrl = new URL(trimmed, baseForRelative).href;
          const indent = line.match(/^\s*/)?.[0] || '';
          if (isPlaylist(absoluteUrl)) return `${indent}${proxyWrap(absoluteUrl)}`;
          if (isHttp(absoluteUrl)) return `${indent}${proxyWrap(absoluteUrl)}`;
          return `${indent}${absoluteUrl}`;
        } catch { return line; }
      }).join('\n');
      return new NextResponse(rewritten, { status: 200, headers: responseHeaders });
    }

    if (response.body) return new NextResponse(response.body, { status: 200, headers: responseHeaders });
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, { status: 200, headers: responseHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error', details: String(error) }, { status: 500 });
  }
}
