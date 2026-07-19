# KickNow26 — Continuation Handoff

_Last updated: 2026-07-19. Written because the chat hit ~93% quota. Pick up from "Next steps"._

## Where we are

The World Cup site is now a **private, TOTP-locked football dashboard** (Real Madrid focus + La Liga, PL, Bundesliga, Serie A, Ligue 1, UCL). Overhaul committed as `a55e237` on `main` (not yet pushed). Full architecture is in `README.md`; the plan is at `C:\Users\Admin\.claude\plans\iridescent-marinating-comet.md`.

### Secrets already set in Cloudflare ✅
- `TOTP_SECRET` ✅
- `AUTH_SECRET` ✅
- `FOOTBALL_DATA_TOKEN` ✅
- `IPTV_M3U_URL` ❌ **deliberately skipped** — see below.

### KV namespace
`KICKNOW_KV` = `7083a777c1ae43029e358dfe6a93929e` (already in `wrangler.jsonc`).

---

## The decision that changes the plan

The owner's IPTV playlist has **40,000+ channels** — too large to fetch/parse in a Worker without timing out or blowing memory. **We are dropping the full-M3U ingestion.**

New approach: **hand-pick a handful of individual channel stream URLs** (the sports channels that actually carry these leagues) and store them directly. On match day we surface the relevant country's channel + backups from other countries.

So the questions to answer are:
1. **Which channels** broadcast each league/match, per country? (research — mostly solved, see below)
2. **How to store** a small set of individual channel URLs instead of a 40k M3U.
3. **Can the current Cloudflare Worker proxy handle these streams?** (analysis below)

---

## Research findings (channel/TV-listing sources)

- **livesoccertv.com is the answer** for "which channel shows match X in country Y." It's a global TV guide keyed by match, returning broadcasters per country.
  - `pablopunk/livesoccertv-parser` (Node) — parses livesoccertv.com into match objects with a `tvs` array (e.g. `['TeleCinco','TV3']`) and supports timezones. **Best fit** — we can port its scraping logic into a Worker-friendly fetch+parse, or call it as reference.
  - `Saturn/live-football-ontv` — UK-only (Sky, TNT/BT, BBC, ITV, Premier Sports).
  - `korncola/tv.sports.parser` — generic TV sports guide scraper.
- **EasySoccerData** (the repo the owner linked, `manucabral/EasySoccerData`) — Python, scrapes SofaScore/Promiedos for live stats/fixtures/events. **Does NOT provide TV/broadcast channel listings.** Useful only if we later want richer live match data (lineups, events) than football-data.org's free tier gives — it's a *stats* source, not a *TV* source. Not needed for the channel-mapping problem.

### Static broadcaster knowledge (doesn't need scraping — these are stable per season)
For a personal site we can hardcode the primary rights-holders per league per country and just let the owner paste their IPTV URL for each:
- **La Liga**: ES = Movistar LaLiga / DAZN LaLiga · UK = Premier Sports · US = ESPN+ · IN = FanCode
- **Premier League**: UK = Sky Sports / TNT Sports · US = NBC/Peacock · IN = Star Sports
- **Bundesliga**: DE = Sky · US = ESPN+ · UK = Sky Sports
- **Serie A**: IT = DAZN/Sky · US = Paramount+/CBS · UK = TNT Sports
- **Ligue 1**: FR = DAZN/beIN · US = beIN/Fubo · UK = TNT Sports
- **UCL**: US = Paramount+ · UK = TNT Sports · ES = Movistar · global = varies
livesoccertv gives the *per-match* precise channel; the static table is the fallback backbone.

---

## Cloudflare Worker + HLS streaming: does current setup hold?

**Current proxy (`app/api/proxy/route.ts`) design is sound and should be kept:**
- It proxies only `.m3u8`/`.m3u` playlists (small text — fine within Worker CPU/time limits), rewrites relative URLs, resolves redirects.
- Media **segments (.ts) go DIRECT to the CDN**, never through the Worker → avoids the Worker CPU-time (default ~30s wall, 50ms–5min CPU depending on plan) and memory limits. This is the correct pattern; do not route segments through the Worker.

**Known risks to verify with a REAL channel URL (we never tested with live streams):**
1. **Mixed content**: if a channel serves `http://` segments, the browser blocks them on our `https://` site. Playlists are proxied (so they're https), but direct segments keep their scheme. → If it bites, either (a) find https variants, or (b) proxy segments too for that one channel (accepting Worker cost — OK for 1 viewer).
2. **Token/IP binding**: many IPTV providers bind stream tokens to the requesting IP. Our playlist is fetched server-side (Worker IP) but segments load client-side (owner's IP) → **token mismatch → 403**. This is literally what bit the old World Cup setup (see commit `00a89d6`). → Mitigation: fetch the playlist client-side too, OR proxy everything through the Worker so it's all one IP. **Test this early.**
3. **CORS on segments**: direct segments need `Access-Control-Allow-Origin: *` from the provider, or the browser blocks them. Pluto.tv had this; a private IPTV provider may not. → fallback: proxy segments.

**Better suggestion for the streaming layer:** for a handful of channels used by one person, the cleanest robust option is **proxy the playlist AND accept optionally proxying segments per-channel** (a flag on each stored channel). Direct-segment is the fast default; flip to proxied-segment for channels that fail due to token/CORS/mixed-content. Cloudflare's free plan (100k req/day, 10ms CPU) is tight for proxied segments; the **$5/mo Workers Paid plan (30s CPU, higher limits)** comfortably handles one viewer proxying a live stream. Recommend the owner be on Workers Paid if we proxy segments.

---

## Next steps (proposed plan for next session)

1. **Replace the M3U ingestion with a small "channels config" model.**
   - New KV doc `channels:v1` (or a repo config file): a list of `{ id, name, country, url, proxySegments?: boolean }`.
   - Drop `lib/channels.ts` M3U fetch + `IPTV_M3U_URL` secret usage; keep `parseM3U` only if we want an "import a small M3U" convenience.
   - Rework `/settings`: owner pastes individual stream URLs + picks country + assigns to competition(s), instead of searching a 40k playlist.
   - Update `lib/mapping.ts` `resolveChannels` to read from the new config instead of the playlist.

2. **(Optional) Add a livesoccertv fetch** — a cached Worker route that, given a match, returns the broadcasting channels per country (port `livesoccertv-parser`'s parsing). Then the watch page can auto-highlight "your country's channel" and list other countries as backups, matching them against the owner's stored channel URLs. Cache hard (livesoccertv is scraping — be gentle; 6–12h TTL, match-keyed).

3. **Add per-channel `proxySegments` support** to `app/api/proxy/route.ts` so channels that fail direct-segment (token/CORS/mixed-content) can route segments through the Worker.

4. **Test with 1 real channel URL end-to-end** before building UI polish — this de-risks items 1–3 in the streaming risks list above. This is the single most important validation and was never done (we only tested auth + data flow via `next dev`).

5. Push to `main` → Cloudflare CI deploys. Secrets are set except we'll be removing `IPTV_M3U_URL` reliance.

---

## Gotchas carried forward
- **OpenNext worker preview is broken on this Windows box** (ChunkLoadError on `[externals]` Turbopack chunks — Windows incompatibility, not our bug). Verify locally with `npm run dev` (`next dev`, bindings emulated via `.dev.vars`). Real builds run on Cloudflare's Linux CI. Don't waste time debugging the local preview crash.
- `.dev.vars` (gitignored) currently has test values for local dev; `TOTP_SECRET=DX3XIW7WXVALAW73JMAR4FW26IA4IMGL` was a **throwaway** used in testing — the real one is in Cloudflare. Regenerate for local if needed via `node scripts/generate-totp.mjs`.
- Old plaintext password `AswathiAjesh@21` is in git history (removed from tree) — never reuse.
- `scripts/build.js` / `build-worker.js` are anti-recursion CI wrappers — don't remove.
- TOTP verified against RFC 6238 vectors; auth flow (login, replay reject, 5-fail lockout, session cookie) verified live in `next dev`.

## Key files
- Proxy/streaming: `app/api/proxy/route.ts`
- Channels/mapping (to be reworked): `lib/channels.ts`, `lib/mapping.ts`, `app/settings/`, `app/api/channels/route.ts`, `app/api/mapping/route.ts`
- Data: `lib/football-data.ts`, `lib/cache.ts`, `lib/competitions.ts`
- Auth: `lib/totp.ts`, `lib/session.ts`, `middleware.ts`, `app/api/auth/`
- Watch flow: `app/watch/[id]/`, `components/VideoPlayer.tsx`, `components/ChannelSelector.tsx`

## Sources
- livesoccertv-parser: https://github.com/pablopunk/livesoccertv-parser
- live-football-ontv (UK): https://github.com/Saturn/live-football-ontv
- tv.sports.parser: https://github.com/korncola/tv.sports.parser
- EasySoccerData (stats, not TV): https://github.com/manucabral/EasySoccerData
