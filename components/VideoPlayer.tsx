'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import type { StoredChannel } from '@/types';

type PlayerState = 'loading' | 'playing' | 'reconnecting' | 'error';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function VideoPlayer({ channel }: { channel: StoredChannel | null }) {
  if (!channel) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-black/60">
        <p className="text-sm text-white/40">Select a channel below to start watching.</p>
      </div>
    );
  }
  // key remounts the player (resetting all state) whenever the channel changes
  return <Player key={channel.url} channel={channel} />;
}

function Player({ channel }: { channel: StoredChannel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const startRef = useRef<() => void>(() => {});
  const [state, setState] = useState<PlayerState>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const streamUrl = `/api/proxy?url=${encodeURIComponent(channel.url)}${channel.proxySegments ? '&seg=1' : ''}`;

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
    const isHls = url.includes('.m3u8') || url.includes('.m3u');

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
        <span className="truncate text-xs text-white/60">{channel.name}</span>
      </div>
    </div>
  );
}
