import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isM3uUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.m3u8') || path.endsWith('.m3u');
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // seg=1 → also route media segments through this proxy (for channels whose
  // streams fail direct: IP-bound tokens, missing CORS, http-only segments).
  const proxySegs = request.nextUrl.searchParams.get('seg') === '1';
  const segSuffix = proxySegs ? '&seg=1' : '';

  try {
    const decodedUrl = decodeURIComponent(urlParam);

    // ── M3U8 playlist: fetch + rewrite segment URLs to be DIRECT (not proxied) ──
    // Segments are binary TS chunks that would time out a Worker. Let hls.js
    // fetch them directly from the stream server; only the playlist needs proxying.
    if (isM3uUrl(decodedUrl)) {
      const finalUrl = await resolveRedirect(decodedUrl);

      const response = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Playlist fetch failed: ${response.status}` },
          { status: response.status }
        );
      }

      const text = await response.text();
      const baseUrl = finalUrl;

      // Rewrite relative URLs in the playlist to absolute direct URLs.
      // Sub-playlists (variant .m3u8) still go through the proxy so we can rewrite them too.
      // Segments (.ts / .aac / etc.) go DIRECT to avoid Worker timeout.
      const rewritten = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#EXT')) {
          // Rewrite URI="..." inside tags (e.g. #EXT-X-KEY)
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
            const abs = toAbsolute(uri, baseUrl);
            // Keys still need proxying for CORS
            return `URI="/api/proxy?url=${encodeURIComponent(abs)}${segSuffix}"`;
          });
        }

        if (trimmed.startsWith('#')) return line;

        // It's a segment or sub-playlist URL
        const abs = toAbsolute(trimmed, baseUrl);
        const indent = line.match(/^\s*/)?.[0] || '';

        if (isM3uUrl(abs)) {
          // Sub-playlist → still proxy so we can rewrite it
          return `${indent}/api/proxy?url=${encodeURIComponent(abs)}${segSuffix}`;
        }

        // Segment → DIRECT by default; proxied when the channel opts in via seg=1
        if (proxySegs) {
          return `${indent}/api/proxy?url=${encodeURIComponent(abs)}&seg=1`;
        }
        return `${indent}${abs}`;
      }).join('\n');

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...CORS_HEADERS,
        },
      });
    }

    // ── Non-M3U8: keys, and media segments when seg=1 ──
    // Stream the body through instead of buffering so multi-MB TS segments
    // don't sit in Worker memory.
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(proxySegs ? 25000 : 10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Proxy error', details: String(error) },
      { status: 500 }
    );
  }
}

function toAbsolute(url: string, base: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url.startsWith('//') ? 'https:' + url : url;
  }
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}
