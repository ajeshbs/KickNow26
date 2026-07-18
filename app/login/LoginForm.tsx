'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, remember }),
      });
      if (res.ok) {
        const to = params.get('to');
        window.location.href = to && to.startsWith('/') ? to : '/';
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'Login failed');
      setCode('');
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-xs rounded-2xl border border-white/10 bg-navy-900 p-8 shadow-2xl"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold-400/10 border border-gold-400/30">
          <svg className="h-5 w-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-white">Enter code</h1>
        <p className="mt-1 text-xs text-white/40">From your authenticator app</p>
      </div>

      <input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white outline-none focus:border-gold-400/60"
        placeholder="••••••"
      />

      <label className="mt-4 flex items-center gap-2 text-sm text-white/60 select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 accent-[#d4af37]"
        />
        Remember me for 90 days
      </label>

      {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="mt-5 w-full rounded-xl bg-gold-400 py-3 text-sm font-semibold text-navy-950 transition-opacity disabled:opacity-40 hover:opacity-90"
      >
        {busy ? 'Verifying…' : 'Unlock'}
      </button>
    </form>
  );
}
