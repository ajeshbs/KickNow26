# Private Football Dashboard

A single-user, TOTP-protected football streaming dashboard built with Next.js 16, React 19, hls.js, and Tailwind CSS v4, deployed to Cloudflare Workers via OpenNext. Covers La Liga, Premier League, Bundesliga, Serie A, Ligue 1, and the Champions League — plus every match Real Madrid plays in any competition.

## Features

- **Real Madrid hero** — the live or next Madrid match front and center with a Watch CTA; a dedicated `/madrid` page lists every fixture/result across all competitions (team 86 on football-data.org).
- **Six leagues** — fixtures, results, standings (CL rendered per group), and top scorers per competition at `/league/[code]` (PD, PL, BL1, SA, FL1, CL).
- **Live streaming** — hls.js player with auto-retry, fed by your personal IPTV M3U playlist. Playlists are proxied through `/api/proxy` (URL rewriting, redirect resolution); media segments go direct to the CDN to avoid Worker timeouts.
- **Channel mapping admin** — `/settings` lets you search your playlist and pin channels to each competition with a broadcaster-country label (e.g. La Liga → DAZN ES, ESPN US). Stored in Cloudflare KV; pins survive provider URL/token rotation via name-based channel ids.
- **TOTP auth** — 6-digit authenticator-app login with "remember me for 90 days" (HMAC-signed session cookie), 5-attempt/15-min brute-force lockout, and one-time-use codes (replay rejection). The auth gate covers everything, including the stream proxy.
- **Anti-discovery** — `robots.txt` disallow-all, `X-Robots-Tag: noindex` on every response, and deliberately generic page metadata.

## Data & caching

Match data comes from the [football-data.org](https://www.football-data.org/) v4 API (free tier). A KV-backed stale-while-revalidate cache keeps usage far below the 10 req/min limit:

| Data | TTL | SWR window |
|---|---|---|
| League fixtures | 10 min | +50 min |
| Real Madrid matches | 5 min | +55 min |
| Standings | 1 h | +5 h |
| Top scorers | 6 h | +18 h |
| IPTV channel list | 6 h | +18 h |

## Setup

1. **KV + secrets**

   ```bash
   npx wrangler kv namespace create KICKNOW_KV   # put the id in wrangler.jsonc
   node scripts/generate-totp.mjs                # scan the QR with your authenticator
   npx wrangler secret put TOTP_SECRET
   npx wrangler secret put AUTH_SECRET
   npx wrangler secret put FOOTBALL_DATA_TOKEN   # free key from football-data.org
   npx wrangler secret put IPTV_M3U_URL          # your provider's playlist URL
   ```

2. **Local dev** — mirror the four secrets in `.dev.vars` (gitignored), then:

   ```bash
   npm run dev       # Next dev with emulated KV + .dev.vars
   npm run preview   # full worker build + wrangler preview (use WSL/Linux; OpenNext runtime is unreliable on Windows)
   ```

3. **Deploy**

   ```bash
   npm run deploy
   ```

   Or push to the connected Git branch and let Cloudflare CI build it (`scripts/build.js` / `scripts/build-worker.js` handle OpenNext's recursive-build quirks — don't remove them).

4. First visit: enter a code from your authenticator, then open **Settings** and pin channels to each competition.
