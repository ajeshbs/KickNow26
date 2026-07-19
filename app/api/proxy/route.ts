import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isM3uUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.m3u8') || path.endsWith('.m3u');
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

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
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

    const response = await fetch(decodedUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(proxySegs ? 25000 : 15000),
    });

    if (!response.ok) {
      response.body?.cancel();
      return NextResponse.json(
        { error: `Upstream fetch failed: ${response.status}` },
        { status: response.status },
      );
    }

    // Redirects were followed — response.url is the final URL, the base for
    // resolving relative playlist entries.
    const finalUrl = response.url || decodedUrl;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    // ── Is this an HLS playlist? ──
    // IPTV URLs often have no extension (Xtream style), so decide from the URL
    // *or* the response: mpegurl content-type, or a textual body starting #EXTM3U.
    const textual =
      contentType.includes('mpegurl') ||
      contentType.includes('text/plain') ||
      contentType.includes('text/html') ||
      contentType.includes('audio/x-mpegurl');

    if (isM3uUrl(decodedUrl) || isM3uUrl(finalUrl) || textual) {
      const text = await response.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        return playlistResponse(rewritePlaylist(text, finalUrl, proxySegs, segSuffix));
      }
      // Textual but not a playlist (error page, key served as text, …) — pass through.
      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'text/plain',
          'Cache-Control': 'no-cache',
          ...CORS_HEADERS,
        },
      });
    }

    // ── Binary: media segments (seg=1) and small files like AES keys ──
    // Never pipe an endless live stream through the Worker — a raw continuous
    // .ts feed would blow the Worker's resource limits (error 1102). Segments
    // requested via seg=1 are finite and expected; anything else that looks
    // like open-ended video gets a clear error instead of a crash.
    if (!proxySegs) {
      const len = Number(response.headers.get('content-length') ?? NaN);
      const looksEndless =
        contentType.includes('mp2t') ||
        contentType.startsWith('video/') ||
        !Number.isFinite(len) ||
        len > 20_000_000;
      if (looksEndless) {
        response.body?.cancel();
        return NextResponse.json(
          {
            error:
              'This URL serves a continuous video stream, not an HLS playlist. ' +
              'Use the .m3u8 form of the channel link (e.g. replace a trailing ".ts" with ".m3u8").',
          },
          { status: 415 },
        );
      }
    }

    // Stream the body through instead of buffering so multi-MB TS segments
    // don't sit in Worker memory.
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Proxy error', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Rewrite playlist URLs: sub-playlists + keys stay proxied (so they can be
 * rewritten / get CORS); media segments go DIRECT unless seg=1.
 */
function rewritePlaylist(
  text: string,
  baseUrl: string,
  proxySegs: boolean,
  segSuffix: string,
): string {
  return text
    .split('\n')
    .map((line) => {
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

      // Segment → DIRECT by default; proxied when the channel opts in via seg=1.
      // http:// segments are always proxied — the browser would block them as
      // mixed content on our https page, so direct can never work.
      if (proxySegs || abs.startsWith('http://')) {
        return `${indent}/api/proxy?url=${encodeURIComponent(abs)}&seg=1`;
      }
      return `${indent}${abs}`;
    })
    .join('\n');
}

function playlistResponse(body: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...CORS_HEADERS,
    },
  });
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
