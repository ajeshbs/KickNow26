'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import type { StoredChannel, StreamProxy } from '@/types';

type PlayerState = 'loading' | 'playing' | 'reconnecting' | 'error';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function VideoPlayer({
  channel,
  proxy,
}: {
  channel: StoredChannel | null;
  proxy?: StreamProxy | null;
}) {
  if (!channel) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-black/60">
        <p className="text-sm text-white/40">Select a channel below to start watching.</p>
      </div>
    );
  }
  // key remounts the player (resetting all state) whenever the channel changes
  return <Player key={channel.url} channel={channel} proxy={proxy ?? null} />;
}

function Player({ channel, proxy }: { channel: StoredChannel; proxy: StreamProxy | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const startRef = useRef<() => void>(() => {});
  const [state, setState] = useState<PlayerState>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const segParam = channel.proxySegments ? '&seg=1' : '';
  const streamUrl = proxy?.url
    ? channel.restream
      ? `${proxy.url}/r?url=${encodeURIComponent(channel.url)}&t=${encodeURIComponent(proxy.token)}`
      : `${proxy.url}/p?url=${encodeURIComponent(channel.url)}${segParam}&t=${encodeURIComponent(proxy.token)}`
    : `/api/proxy?url=${encodeURIComponent(channel.url)}${segParam}`;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
  }, []);

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const url = streamUrl;
    // IPTV links often have no extension (Xtream style) but still serve HLS via
    // the proxy — default to HLS unless it's clearly a plain video file.
    const isHls = !/\.(mp4|webm|mkv|mov)(\?|$)/i.test(channel.url);

    const retry = () => {
      retriesRef.current++;
      setRetryCount(retriesRef.current);
      if (retriesRef.current > MAX_RETRIES) {
        setErrorMsg('Stream unavailable after multiple retries.');
        setState('error');
        return;
      }
      setState('reconnecting');
      cleanup();
      retryTimerRef.current = setTimeout(() => startRef.current(), RETRY_DELAY);
    };

    const markPlaying = () => {
      retriesRef.current = 0;
      setRetryCount(0);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setState('playing');
    };

    timeoutRef.current = setTimeout(retry, 30000);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveDurationInfinity: true,
        backBufferLength: Infinity,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 200 * 1000 * 1000,
        maxBufferHole: 0.5,
        nudgeOffset: 0.3,
        nudgeMaxRetry: 5,
        // VPS restream holds the first manifest request while ffmpeg warms up
        manifestLoadingTimeOut: 30000,
        abrEwmaDefaultEstimate: 2000000,
        abrBandWidthFactor: 0.9,
        abrBandWidthUpFactor: 0.95,
        startLevel: -1,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      video.addEventListener('playing', markPlaying, { once: true });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) retry();
      });
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('playing', markPlaying, { once: true });
      video.addEventListener('loadedmetadata', () => { video.play().catch(() => {}); }, { once: true });
      video.addEventListener('error', retry, { once: true });
    } else if (!isHls) {
      video.src = url;
      video.addEventListener('playing', markPlaying, { once: true });
      video.addEventListener('loadedmetadata', () => { video.play().catch(() => {}); }, { once: true });
      video.addEventListener('error', retry, { once: true });
    } else {
      setErrorMsg('HLS not supported on this browser.');
      setState('error');
    }
  }, [streamUrl, cleanup]);

  useEffect(() => {
    startRef.current = startPlayback;
  }, [startPlayback]);

  useEffect(() => {
    startRef.current();
    return cleanup;
  }, [cleanup]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
      <div className="relative aspect-video bg-black">
        {(state === 'loading' || state === 'reconnecting') && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-400" />
              <span className="text-sm text-white/40">
                {state === 'reconnecting' ? 'Reconnecting…' : 'Loading stream…'}
              </span>
              {state === 'reconnecting' && (
                <span className="text-xs text-white/20">Retry {retryCount}/{MAX_RETRIES}</span>
              )}
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4 px-6 text-center">
              <svg className="h-12 w-12 text-gold-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-white/50">{errorMsg}</span>
              <button
                onClick={() => {
                  retriesRef.current = 0;
                  setRetryCount(0);
                  cleanup();
                  setState('loading');
                  setErrorMsg(null);
                  startRef.current();
                }}
                className="rounded-lg bg-gold-400 px-4 py-2 text-xs font-semibold text-navy-950 transition-opacity hover:opacity-90"
              >
                Retry now
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          autoPlay
          muted
          controls
          preload="auto"
          disablePictureInPicture
        />
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 bg-navy-950 px-4 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
        <span className="min-w-0 flex-1 truncate text-xs text-white/60">{channel.name}</span>
        <button
          onClick={() => navigator.clipboard.writeText(channel.url).catch(() => {})}
          className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/50 transition-colors hover:text-white"
          title="Copy the direct stream URL (paste into VLC: Media → Open Network Stream)"
        >
          Copy link
        </button>
        <button
          onClick={() => {
            // .m3u download — opening it launches VLC (or the default player),
            // which streams DIRECT from this device: full quality, no Worker.
            const m3u = `#EXTM3U\n#EXTINF:-1,${channel.name}\n${channel.url}\n`;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([m3u], { type: 'audio/x-mpegurl' }));
            a.download = `${channel.name.replace(/[^\w ()-]+/g, '_')}.m3u`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          className="shrink-0 rounded-md border border-gold-400/40 px-2 py-1 text-xs font-semibold text-gold-300 transition-colors hover:bg-gold-400/10"
          title="Download a one-channel .m3u — open it in VLC for full quality without the proxy"
        >
          Open in VLC
        </button>
      </div>
    </div>
  );
}
