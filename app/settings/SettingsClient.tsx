'use client';

import { useEffect, useState } from 'react';
import { COMPETITIONS } from '@/lib/competitions';
import type { ChannelMapping, MappedChannel } from '@/types';
import ChannelPicker from '@/components/ChannelPicker';

export default function SettingsClient() {
  const [mapping, setMapping] = useState<ChannelMapping | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mapping')
      .then((r) => r.json() as Promise<ChannelMapping>)
      .then(setMapping)
      .catch(() => setError('Failed to load mapping'));
  }, []);

  function updateComp(code: string, pins: MappedChannel[]) {
    if (!mapping) return;
    setMapping({ ...mapping, competitions: { ...mapping.competitions, [code]: pins } });
    setSavedAt(null);
  }

  async function save() {
    if (!mapping || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSavedAt(Date.now());
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (error && !mapping) return <p className="text-sm text-red-400">{error}</p>;
  if (!mapping) return <p className="text-sm text-white/40">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      {COMPETITIONS.map((comp) => (
        <ChannelPicker
          key={comp.code}
          competition={comp}
          pins={mapping.competitions[comp.code] ?? []}
          onChange={(pins) => updateComp(comp.code, pins)}
        />
      ))}

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {error && <span className="text-sm text-red-400">{error}</span>}
        {savedAt && <span className="text-sm text-white/40">Saved ✓</span>}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-gold-400 px-8 py-3 text-sm font-bold text-navy-950 shadow-lg shadow-black/40 transition-opacity disabled:opacity-40 hover:opacity-90"
        >
          {saving ? 'Saving…' : 'Save mapping'}
        </button>
      </div>
    </div>
  );
}
