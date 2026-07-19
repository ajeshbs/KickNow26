// KickNow26 stream proxy — zero-dependency Node 18+ server.
// Mirrors the app's /api/proxy logic without serverless CPU limits, so it can
// pipe full-bitrate FHD segments. Run it on any VPS behind HTTPS.
//
//   TOKEN=<long-random-string> PORT=8788 node server.mjs
//
// Endpoints:
//   GET /p?url=<encoded stream url>&seg=0|1&t=<token>   pass-through proxy
//   GET /r?url=<encoded stream url>&t=<token>           ffmpeg restream:
//       deinterlaces + re-encodes to clean progressive HLS (needs ffmpeg
//       installed; spawned on demand, killed after ~90s idle).
//       QUALITY=720 env downscales to 720p (halves CPU); default 1080.

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, existsSync, readFileSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.PORT ?? 8788);
const TOKEN = process.env.TOKEN;
const QUALITY = process.env.QUALITY === '720' ? '720' : '1080';
if (!TOKEN) {
  console.error('Refusing to start: set the TOKEN env var (long random string).');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const FETCH_HEADERS = { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

/* ── shared helpers ─────────────────────────────────────────────────── */

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

function send(res, status, headers, body) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}

/* ── pass-through proxy (/p) ────────────────────────────────────────── */

function proxied(absUrl, seg) {
  return `/p?url=${encodeURIComponent(absUrl)}${seg ? '&seg=1' : ''}&t=${encodeURIComponent(TOKEN)}`;
}

function rewritePlaylist(text, baseUrl, proxySegs) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('#EXT')) {
        return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
          return `URI="${proxied(toAbsolute(uri, baseUrl), proxySegs)}"`;
        });
      }
      if (trimmed.startsWith('#')) return line;

      const abs = toAbsolute(trimmed, baseUrl);
      const indent = line.match(/^\s*/)?.[0] || '';

      if (isM3uUrl(abs)) return `${indent}${proxied(abs, proxySegs)}`;
      if (proxySegs || abs.startsWith('http://')) return `${indent}${proxied(abs, true)}`;
      return `${indent}${abs}`;
    })
    .join('\n');
}

async function handleProxy(reqUrl, res) {
  const target = reqUrl.searchParams.get('url');
  if (!target) return send(res, 400, { 'Content-Type': 'text/plain' }, 'missing url');
  const proxySegs = reqUrl.searchParams.get('seg') === '1';

  let response = await fetch(target, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(20000) });

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
    contentType.includes('mpegurl') || contentType.includes('text/plain') || contentType.includes('text/html');

  if (isM3uUrl(target) || isM3uUrl(finalUrl) || textual) {
    const text = await response.text();
    if (text.trimStart().startsWith('#EXTM3U')) {
      return send(
        res,
        200,
        { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        rewritePlaylist(text, finalUrl, proxySegs),
      );
    }
    return send(res, 200, { 'Content-Type': contentType || 'text/plain', 'Cache-Control': 'no-cache' }, text);
  }

  res.writeHead(200, {
    ...CORS,
    'Content-Type': contentType || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}

/* ── ffmpeg restream (/r) ───────────────────────────────────────────── */

const RESTREAM_ROOT = join(tmpdir(), 'kicknow-restream');
const IDLE_MS = 90_000;
const MAX_JOBS = 2; // protect the CPU — one match + RM TV at most
const jobs = new Map(); // id → { id, proc, dir, lastAccess }

function jobId(src) {
  return createHash('sha1').update(src).digest('hex').slice(0, 12);
}

function stopJob(id) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  try { job.proc.kill('SIGKILL'); } catch {}
  rmSync(job.dir, { recursive: true, force: true });
  console.log(`[restream ${id}] stopped`);
}

function ensureJob(src) {
  const id = jobId(src);
  const existing = jobs.get(id);
  if (existing) {
    existing.lastAccess = Date.now();
    return existing;
  }
  if (jobs.size >= MAX_JOBS) {
    const oldest = [...jobs.values()].sort((a, b) => a.lastAccess - b.lastAccess)[0];
    stopJob(oldest.id);
  }

  const dir = join(RESTREAM_ROOT, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // yadif=1:-1:1 → field-to-frame (50p), auto parity, only frames flagged
  // interlaced — progressive sources pass through untouched.
  const vf = QUALITY === '720' ? 'yadif=1:-1:1,scale=-2:720' : 'yadif=1:-1:1';
  const vbit = QUALITY === '720' ? '3000k' : '5000k';
  const args = [
    '-hide_banner', '-loglevel', 'warning', '-nostdin',
    '-user_agent', UA,
    '-i', src,
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', vbit, '-maxrate', vbit, '-bufsize', '10M',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-f', 'hls', '-hls_time', '4', '-hls_list_size', '6',
    '-hls_flags', 'delete_segments+independent_segments',
    join(dir, 'index.m3u8'),
  ];
  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  proc.stderr.on('data', (d) => console.error(`[ffmpeg ${id}]`, d.toString().trim()));
  proc.on('exit', (code) => {
    console.log(`[restream ${id}] ffmpeg exited (${code})`);
    jobs.delete(id);
  });
  proc.on('error', (err) => {
    console.error(`[restream ${id}] spawn failed: ${err.message} (is ffmpeg installed?)`);
    jobs.delete(id);
  });

  const job = { id, proc, dir, lastAccess: Date.now() };
  jobs.set(id, job);
  console.log(`[restream ${id}] started (${QUALITY}p) ← ${src.slice(0, 80)}`);
  return job;
}

setInterval(() => {
  for (const job of [...jobs.values()]) {
    if (Date.now() - job.lastAccess > IDLE_MS) stopJob(job.id);
  }
}, 15_000).unref();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handleRestreamStart(reqUrl, res) {
  const target = reqUrl.searchParams.get('url');
  if (!target) return send(res, 400, { 'Content-Type': 'text/plain' }, 'missing url');

  // Feed ffmpeg the /live/ HLS form when the pasted URL is the extension-less
  // or .m3u8-without-/live/ Xtream variant.
  const src = withLivePrefix(target) ?? target;
  const job = ensureJob(src);

  // Wait for the first playlist to appear (encoder startup: usually 3–8s).
  const playlist = join(job.dir, 'index.m3u8');
  for (let i = 0; i < 50 && !existsSync(playlist); i++) {
    if (!jobs.has(job.id)) {
      return send(res, 502, { 'Content-Type': 'text/plain' }, 'ffmpeg failed to start — check VPS logs (is ffmpeg installed?)');
    }
    await sleep(400);
  }
  if (!existsSync(playlist)) {
    return send(res, 504, { 'Content-Type': 'text/plain' }, 'restream startup timed out');
  }
  return send(res, 302, { Location: `/r/${job.id}/index.m3u8?t=${encodeURIComponent(TOKEN)}` }, undefined);
}

function handleRestreamFile(id, file, res) {
  if (!/^[\w-]+$/.test(id) || !/^[\w.-]+$/.test(file) || file.includes('..')) {
    return send(res, 400, { 'Content-Type': 'text/plain' }, 'bad path');
  }
  const job = jobs.get(id);
  if (job) job.lastAccess = Date.now();

  const path = join(RESTREAM_ROOT, id, file);
  if (!existsSync(path)) return send(res, 404, { 'Content-Type': 'text/plain' }, 'gone (restream stopped?)');

  if (file.endsWith('.m3u8')) {
    // Append the token to segment lines so hls.js's requests pass the guard.
    const text = readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => (line.trim() && !line.startsWith('#') ? `${line.trim()}?t=${encodeURIComponent(TOKEN)}` : line))
      .join('\n');
    return send(
      res,
      200,
      { 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      text,
    );
  }

  res.writeHead(200, { ...CORS, 'Content-Type': 'video/mp2t', 'Cache-Control': 'no-cache' });
  createReadStream(path).pipe(res);
}

/* ── server ─────────────────────────────────────────────────────────── */

const server = createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    return send(res, 204, { 'Access-Control-Max-Age': '86400' }, undefined);
  }
  if (reqUrl.searchParams.get('t') !== TOKEN) {
    return send(res, 403, { 'Content-Type': 'text/plain' }, 'forbidden');
  }

  try {
    if (reqUrl.pathname === '/p') return await handleProxy(reqUrl, res);
    if (reqUrl.pathname === '/r') return await handleRestreamStart(reqUrl, res);
    const m = reqUrl.pathname.match(/^\/r\/([^/]+)\/([^/]+)$/);
    if (m) return handleRestreamFile(m[1], m[2], res);
    return send(res, 404, { 'Content-Type': 'text/plain' }, 'not found');
  } catch (err) {
    if (!res.headersSent) send(res, 502, { 'Content-Type': 'text/plain' }, `proxy error: ${err}`);
    else res.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`KickNow26 stream proxy listening on :${PORT} (restream quality: ${QUALITY}p)`);
});
