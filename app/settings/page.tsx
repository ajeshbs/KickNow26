import Navigation from '@/components/Navigation';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <>
      <Navigation />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <h1 className="text-xl font-bold text-white">Channel mapping</h1>
        <p className="text-sm text-white/50">
          Pin channels from your IPTV playlist to each competition. Add a label for the
          broadcaster country (e.g. “Spain”, “UK”, “USA”) — channels are grouped by it on the
          watch page.
        </p>
        <SettingsClient />
      </main>
    </>
  );
}
