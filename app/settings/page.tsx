import Navigation from '@/components/Navigation';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-bold text-white">Channels</h1>
        <p className="text-sm text-white/50">
          Paste individual stream URLs from your IPTV provider, tag each with its country and
          the competitions it broadcasts. On the watch page the domestic country&apos;s channel
          is listed first, other countries follow as backups.
        </p>
        <SettingsClient />
      </main>
    </>
  );
}
