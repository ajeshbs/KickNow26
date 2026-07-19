// KickNow26 stream proxy — zero-dependency Node 18+ server.
// Mirrors the app's /api/proxy logic without serverless CPU limits, so it can
// pipe full-bitrate FHD segments. Run it on any VPS behind HTTPS.
//
//   TOKEN=<long-random-string> PORT=8788 node server.mjs
//
// Endpoint: GET /p?url=<encoded stream url>&seg=0|1&t=<token>

import { createServer } from 'node:http';
import { Readable } from 'node:stream';

const PORT = Number(process.env.PORT ?? 8788);
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('Refusing to start: set the TOKEN env var (long random string).');
  process.exit(1);
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function isM3uUrl(url) {
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.m3u8') || path.endsWith('.m3u');
}

/** host/user/pass/id.m3u8 → host/live/user/pass/id.m3u8 (null if not that shape). */
function withLivePrefix(url) {
  try {
    const u = new URL(url);
    if (/^\/[^/]+\/[^/]+\/[^/]+\.m3u8?$/i.test(u.pathname) && !u.pathname.startsWith('/live/')) {
      u.pathname = '/live' + u.pathname;
      return u.href;
    }
  } catch {}
  return null;
}

function toAbsolute(url, base) {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url.startsWith('//') ? 'https:' + url : url;
  }
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function proxied(absUrl, seg) {
  return `/p?url=${encodeURIComponent(absUrl)}${seg ? '&seg=1' : ''}&t=${encodeURIComponent(TOKEN)}`;
}

function rewritePlaylist(text, baseUrl, proxySegs) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#EXT')) {
        // Rewrite URI="..." inside tags (e.g. #EXT-X-KEY) — keys stay proxied.
        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          return `URI="${proxied(toAbsolute(uri, baseUrl), proxySegs)}"`;
        });
      }
      if (trimmed.startsWith('#')) return line;

      const abs = toAbsolute(trimmed, baseUrl);
      const indent = line.match(/^\s*/)?.[0] || '';

      if (isM3uUrl(abs)) return `${indent}${proxied(abs, proxySegs)}`; // sub-playlist
      // Segments: direct when https (saves VPS bandwidth); proxied when http
      // (mixed content) or the channel opted in via seg=1.
      if (proxySegs || abs.startsWith('http://')) return `${indent}${proxied(abs, true)}`;
      return `${indent}${abs}`;
    })
    .join('\n');
}

function send(res, status, headers, body) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    return send(res, 204, { 'Access-Control-Max-Age': '86400' }, undefined);
  }
  if (reqUrl.pathname !== '/p') {
    return send(res, 404, { 'Content-Type': 'text/plain' }, 'not found');
  }
  if (reqUrl.searchParams.get('t') !== TOKEN) {
    return send(res, 403, { 'Content-Type': 'text/plain' }, 'forbidden');
  }
  const target = reqUrl.searchParams.get('url');
  if (!target) {
    return send(res, 400, { 'Content-Type': 'text/plain' }, 'missing url');
  }
  const proxySegs = reqUrl.searchParams.get('seg') === '1';

  try {
    let response = await fetch(target, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(20000),
    });

    // Xtream servers often only serve HLS under /live/user/pass/id.m3u8.
    if (!response.ok && isM3uUrl(target)) {
      const alt = withLivePrefix(target);
      if (alt) {
        response.body?.cancel();
        response = await fetch(alt, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(20000) });
      }
    }

    if (!response.ok) {
      response.body?.cancel();
      return send(res, response.status, { 'Content-Type': 'text/plain' }, `upstream ${response.status}`);
    }

    const finalUrl = response.url || target;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const textual =
      contentType.includes('mpegurl') ||
      contentType.includes('text/plain') ||
      contentType.includes('text/html');

    if (isM3uUrl(target) || isM3uUrl(finalUrl) || textual) {
      const text = await response.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        return send(
          res,
          200,
          {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
          rewritePlaylist(text, finalUrl, proxySegs),
        );
      }
      return send(res, 200, { 'Content-Type': contentType || 'text/plain', 'Cache-Control': 'no-cache' }, text);
    }

    // Binary (segments, keys) — stream straight through.
    res.writeHead(200, {
      ...CORS,
      'Content-Type': contentType || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      send(res, 502, { 'Content-Type': 'text/plain' }, `proxy error: ${err}`);
    } else {
      res.destroy();
    }
  }
});

server.listen(PORT, () => {
  console.log(`KickNow26 stream proxy listening on :${PORT}`);
});
