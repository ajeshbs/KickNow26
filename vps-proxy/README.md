# VPS stream proxy

Runs the stream proxy on your own VPS instead of Cloudflare Workers — no CPU
limits, so FHD channels play without error 1102.

## Setup (Node 18+ required)

```bash
# 1. Copy server.mjs to the VPS, then:
TOKEN=$(openssl rand -hex 24)   # keep this — you'll paste it into /settings
echo $TOKEN
TOKEN=$TOKEN PORT=8788 node server.mjs
```

## HTTPS (required — the site is https, so the proxy must be too)

Easiest is [Caddy](https://caddyserver.com) with a (sub)domain pointing at the VPS:

```bash
caddy reverse-proxy --from proxy.yourdomain.com --to :8788
```

No domain? Grab a free one at duckdns.org and point it at the VPS IP.

## Keep it running (systemd)

```ini
# /etc/systemd/system/kicknow-proxy.service
[Unit]
Description=KickNow26 stream proxy
After=network.target

[Service]
Environment=TOKEN=<your token>
Environment=PORT=8788
ExecStart=/usr/bin/node /opt/kicknow/server.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now kicknow-proxy
```

## Restream / deinterlace mode (optional)

Install ffmpeg (`apt install ffmpeg`) and restart the service. Channels with
the **Deinterlace** checkbox enabled in /settings are then re-encoded on the
VPS on demand: interlaced (1080i) feeds come out as clean progressive HLS —
no more combing/wobbly lines. ffmpeg starts when you press play and stops
~90s after you stop watching. `QUALITY=720` in the service environment
halves the CPU cost if 1080p encoding struggles.

## Connect the site

Open **Settings → Streaming proxy** and enter:

- URL: `https://proxy.yourdomain.com`
- Token: the value you generated above

Save. All playback immediately routes through the VPS; clear the fields to fall
back to the built-in Cloudflare proxy.
