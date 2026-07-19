'use client';

import { useEffect, useState } from 'react';
import { CHANNEL_TAGS } from '@/lib/competitions';
import { COUNTRIES } from '@/lib/countries';
import { SUGGESTED_CHANNELS } from '@/lib/presets';
import type { StoredChannel } from '@/types';

function newChannel(): StoredChannel {
  return {
    id: crypto.randomUUID(),
    name: '',
    country: 'ES',
    url: '',
    competitions: [],
    proxySegments: false,
  };
}

export default function SettingsClient() {
  const [channels, setChannels] = useState<StoredChannel[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/channels')
      .then((r) => r.json() as Promise<{ channels: StoredChannel[] }>)
      .then((data) => setChannels(data.channels))
      .catch(() => setError('Failed to load channels'));
  }, []);

  function update(id: string, patch: Partial<StoredChannel>) {
    if (!channels) return;
    setChannels(channels.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSavedAt(null);
  }

  function remove(id: string) {
    if (!channels) return;
    setChannels(channels.filter((c) => c.id !== id));
    setSavedAt(null);
  }

  function add() {
    if (!channels) return;
    setChannels([...channels, newChannel()]);
    setSavedAt(null);
  }

  function loadPresets() {
    if (!channels) return;
    const have = new Set(channels.map((c) => c.name.trim().toLowerCase()));
    const missing = SUGGESTED_CHANNELS.filter((p) => !have.has(p.name.toLowerCase())).map(
      (p) => ({
        id: crypto.randomUUID(),
        name: p.name,
        country: p.country,
        url: '',
        competitions: [...p.competitions],
        proxySegments: false,
      }),
    );
    if (missing.length === 0) return;
    setChannels([...channels, ...missing]);
    setSavedAt(null);
  }

  const presetsLeft = channels
    ? SUGGESTED_CHANNELS.filter(
        (p) => !channels.some((c) => c.name.trim().toLowerCase() === p.name.toLowerCase()),
      ).length
    : 0;

  async function save() {
    if (!channels || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSavedAt(Date.now());
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (error && !channels) return <p className="text-sm text-red-400">{error}</p>;
  if (!channels) return <p className="text-sm text-white/40">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      {presetsLeft > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-400/20 bg-gold-400/5 p-4">
          <p className="text-sm text-white/60">
            Load the {presetsLeft} suggested broadcaster channels (ES · UK · DE · FR · IT · US,
            2025-26 rights holders) — then just paste your provider&apos;s link into each one
            you have. Channels without a link are ignored on the watch page.
          </p>
          <button
            onClick={loadPresets}
            className="rounded-lg border border-gold-400/60 px-4 py-2 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-400/10"
          >
            Load suggested channels
          </button>
        </div>
      )}

      {channels.map((ch) => (
        <section key={ch.id} className="rounded-2xl border border-white/10 bg-navy-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={ch.name}
              onChange={(e) => update(ch.id, { name: e.target.value })}
              placeholder="Channel name (e.g. beIN Sports 1 FR)"
              className="min-w-48 flex-1 rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-gold-400/60"
            />
            <select
              value={ch.country}
              onChange={(e) => update(ch.id, { country: e.target.value })}
              className="rounded-lg border border-white/10 bg-navy-950 px-2 py-2 text-sm text-white outline-none focus:border-gold-400/60"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => remove(ch.id)}
              className="rounded-md p-2 text-white/40 hover:text-red-400"
              title="Remove channel"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <input
            value={ch.url}
            onChange={(e) => update(ch.id, { url: e.target.value })}
            placeholder="Paste stream URL (https://…/stream.m3u8) — empty = inactive"
            spellCheck={false}
            className={`mt-2 w-full rounded-lg border bg-navy-950 px-3 py-2 font-mono text-xs text-white/80 outline-none focus:border-gold-400/60 ${
              ch.url.trim() ? 'border-white/10' : 'border-dashed border-white/20'
            }`}
          />
          {/\.ts(\?|$)/i.test(ch.url.trim()) && (
            <p className="mt-1 text-xs text-amber-400/90">
              This is a raw .ts stream — replace &quot;.ts&quot; with &quot;.m3u8&quot; so it
              plays as HLS (most IPTV providers serve both).
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CHANNEL_TAGS.map((tag) => {
              const on = ch.competitions.includes(tag.code);
              return (
                <button
                  key={tag.code}
                  onClick={() =>
                    update(ch.id, {
                      competitions: on
                        ? ch.competitions.filter((c) => c !== tag.code)
                        : [...ch.competitions, tag.code],
                    })
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    on
                      ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                      : 'border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}

            <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                checked={Boolean(ch.proxySegments)}
                onChange={(e) => update(ch.id, { proxySegments: e.target.checked })}
                className="accent-gold-400"
              />
              Proxy segments
              <span
                className="cursor-help text-white/30"
                title="Route video segments through the server too. Turn on only if the stream fails to play directly (403 errors, CORS, http-only segments)."
              >
                ⓘ
              </span>
            </label>
          </div>
        </section>
      ))}

      <button
        onClick={add}
        className="rounded-2xl border border-dashed border-white/20 py-3 text-sm text-white/50 transition-colors hover:border-gold-400/50 hover:text-gold-300"
      >
        + Add channel
      </button>

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {error && <span className="text-sm text-red-400">{error}</span>}
        {savedAt && <span className="text-sm text-white/40">Saved ✓</span>}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-gold-400 px-8 py-3 text-sm font-bold text-navy-950 shadow-lg shadow-black/40 transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          {saving ? 'Saving…' : 'Save channels'}
        </button>
      </div>
    </div>
  );
}
