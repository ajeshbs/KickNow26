# KICKNOW26 — FIFA World Cup 2026 Streaming Platform

An unofficial FIFA World Cup 2026 live streaming platform built with Next.js 16, React 19, hls.js, and Tailwind CSS v4. Features live IPTV match streaming, real-time match data from the worldcup26.ir API, group standings, top scorers, and more.

## Features

- **Live TV Streaming** — HLS-based video player using hls.js with AES-128 decryption support. Streams IPTV sports channels from the iptv-org M3U playlist, with auto-retry on stream failure (up to 3 retries, then manual retry).
- **Today's Games Slider** — Auto-scrolling carousel of today's matches. Highlights the currently live game first, then upcoming and finished matches by time. Falls back to next upcoming matches if no games are scheduled today.
- **Live Match Card** — Glowing card for the active game with pulsing live indicator, real-time score, and stage info.
- **Upcoming Matches** — Horizontally scrollable row of compact match cards. "View all" toggle (shows 10 by default).
- **Previous Results** — Scrollable row of finished matches sorted newest first, with winner-highlighted scores and dimmed losers.
- **Group Standings** — Responsive grid of group tables (Groups A–L) showing position, team flag, P/W/D/L, goal difference, and points. Sorted by points, GD, goals scored.
- **Overall Standings** — Full league table of all 48 teams ranked by points with medal icons for top 3 and progress bars.
- **Top Scorers** — Top 30 goal-scorers leaderboard parsed from match data, with medal highlights for top 3 and goal-count progress bars.
- **Channel Selector** — Searchable dropdown to switch between available IPTV channels (FIFA+ 720p, Sports Grid, and filtered sports channels from iptv-org).
- **CORS Proxy** — Built-in API proxy to resolve redirects (jmp2.uk → Pluto.tv), rewrite HLS playlist URLs, forward cookies, and handle AES-128 key requests.
- **Auto-Retry** — On fatal hls.js errors, timeout, or native playback errors: automatically retries up to 3 times with a "Reconnecting..." overlay before showing a permanent error with manual retry.
- **Responsive Design** — Full-width stacked sections, mobile-first layout with glass-morphism cards and dark theme (red/gold accents).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (App Router, Turbopack) |
| UI Library | React 19.2.4 |
| Video | hls.js 1.6.16 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5 |
| Streaming | IPTV M3U (iptv-org) + Pluto.tv CDN |
| Match Data | worldcup26.ir API |
| Proxy | Built-in Next.js API route |

## Architecture

```
┌─ Browser ─────────────────────────────────────┐
│  hls.js ← master.m3u8 → /api/proxy → stitcher │
│    ↓ (rewritten) sub-playlist URLs proxied     │
│    ↓ (direct) segment/key URLs → mcdn-01 CDN  │
│  React UI ← worldcup26.ir API → Match data    │
└───────────────────────────────────────────────┘
```

The proxy handles playlist files from `stitcher-ipv4.pluto.tv` (restrictive CORS) and rewrites relative URLs through the proxy. Media segments and AES-128 keys are served directly from `mcdn-01.plutotv.net` (which has `Access-Control-Allow-Origin: *`), avoiding proxy latency for large files.

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Project Structure

```
kicknow26/
├── app/
│   ├── api/
│   │   ├── channels/route.ts     # IPTV channel list API
│   │   └── proxy/route.ts        # CORS proxy (playlist rewrite, redirect)
│   ├── globals.css               # Tailwind global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page (full-width sections)
├── components/
│   ├── ChannelSelector.tsx       # Searchable channel dropdown
│   ├── GroupStandings.tsx        # Per-group standing tables
│   ├── HeroSection.tsx           # Hero with title/teams/matches
│   ├── LiveMatchCard.tsx         # Live game glow card
│   ├── Navigation.tsx            # Top navigation bar
│   ├── OverallStandings.tsx      # All teams ranked table
│   ├── PreviousResults.tsx       # Finished matches scroller
│   ├── TodaySlider.tsx           # Today's games carousel
│   ├── TopScorers.tsx            # Goal-scorers leaderboard
│   ├── UpcomingMatches.tsx       # Upcoming matches scroller
│   └── VideoPlayer.tsx           # hls.js player overlay
├── lib/
│   ├── m3u-parser.ts             # M3U fetch, parse, filter
│   ├── match-data.ts             # Match loading with fallback
│   ├── standings.ts              # Standings & scorers computation
│   └── worldcup-api.ts           # worldcup26.ir API client
├── types/
│   └── index.ts                  # TypeScript interfaces
├── public/                       # Static assets
├── next.config.ts
├── vercel.json                   # Vercel deployment config
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

## API Reference

### `GET /api/channels`

Returns filtered IPTV channel list (FIFA+ 720p pinned first, then sports channels from iptv-org).

### `GET /api/proxy?url=<encoded_url>&resolve=1`

- **`url`** — The target URL to proxy (HLS playlist/segment/key).
- **`resolve=1`** — Only resolve redirects, return JSON `{ url, redirected }`.

The proxy:
1. Resolves redirects (HEAD request) for M3U URLs
2. Fetches the target content with browser-like User-Agent
3. For M3U playlists: rewrites relative URLs to go through proxy, leaves absolute CDN URLs intact
4. Forwards `Set-Cookie` headers from the upstream
5. Sets `Access-Control-Allow-Origin: *` on all responses

## Data Sources

- **Match data**: `https://worldcup26.ir/get/games` (104 matches, no auth)
- **Team flags**: `https://worldcup26.ir/get/teams` → flagcdn.com URLs
- **IPTV channels**: `https://iptv-org.github.io/iptv/categories/sports.m3u`
- **FIFA+ stream**: `https://jmp2.uk/plu-660c29b5aec9680008f5b4a4.m3u8` (redirects to Pluto.tv stitcher with JWT auth)

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import repo in Vercel
3. Deploy — no extra config needed (`vercel.json` is pre-configured)
4. (Optional) Set `NEXT_PUBLIC_SITE_URL` env var to your Vercel domain

### Manual

```bash
npm run build
npm start
```

## Disclaimer

**IMPORTANT — PLEASE READ CAREFULLY**

This project is provided **as-is, for educational and informational purposes only**. By using this software, you acknowledge and agree to the following:

### Unofficial Status
This is an **unofficial** project. It is **not affiliated with, endorsed by, or connected to** FIFA, the Fédération Internationale de Football Association, the FIFA World Cup, any participating national football federations, Pluto.tv, IPTV-org, or any content broadcaster or rights holder.

### No Hosting of Copyrighted Content
This project does **not host, store, upload, or distribute** any copyrighted video content, broadcast feeds, or media files. It is a client-side software tool that:

- Aggregates **publicly available** M3U playlist URLs from third-party open directories (IPTV-org)
- Displays match information from a **public third-party API** (worldcup26.ir)
- Plays media directly from **third-party CDN servers** — the software never stores, caches, or retransmits media

All media streams originate from third-party servers and are transmitted **directly between those servers and the end user's browser**. This project acts solely as a directory/index of publicly listed streams.

### User Responsibility
- You are **solely responsible** for ensuring that your use of this software complies with all applicable laws in your jurisdiction
- You should **only access streams** that you are legally entitled to view
- Streaming copyrighted content without proper authorization may be illegal in some countries
- This project does not encourage or condone piracy or copyright infringement

### Third-Party Services
This project relies on third-party services including but not limited to:
- IPTV-org (M3U playlist directory)
- worldcup26.ir (match data API)
- Various CDN providers (Pluto.tv, CloudFront, Akamai, etc.)

The availability, legality, and content of these third-party services are **outside the control** of this project's maintainers.

### No Warranties
This software is provided **"as is" without warranty of any kind**, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of the software.

### Trademarks
All trademarks, service marks, and trade names referenced herein (including "FIFA", "World Cup", "FOX Sports", etc.) are the property of their respective owners. Reference to any product, service, or organization does not imply endorsement or affiliation.

### Removal of Content
If you are a rights holder and believe that any content referenced by this project infringes your copyright, please open an issue or contact the maintainers. Upon verification, the infringing references will be promptly removed.

---

**For educational purposes only. Use at your own risk.**
