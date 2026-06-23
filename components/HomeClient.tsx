'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import LiveMatchCard from '@/components/LiveMatchCard';
import UpcomingMatches from '@/components/UpcomingMatches';
import PreviousResults from '@/components/PreviousResults';
import GroupStandings from '@/components/GroupStandings';
import OverallStandings from '@/components/OverallStandings';
import TopScorers from '@/components/TopScorers';
import TodaySlider from '@/components/TodaySlider';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false });
import ChannelSelector from '@/components/ChannelSelector';
import { loadMatches } from '@/lib/match-data';
import { computeGroupStandings, computeOverallStandings, computeTopScorers } from '@/lib/standings';
import type { Channel, Match } from '@/types';

export default function HomeClient() {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchSource, setMatchSource] = useState('');

  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [channelError, setChannelError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { matches, source } = await loadMatches();
      setAllMatches(matches);
      setMatchSource(source);
      setIsLoadingMatches(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadChannels() {
      try {
        const res = await fetch('/api/channels');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (data.channels?.length > 0) {
          setChannels(data.channels);
          setCurrentChannel(data.channels[0]);
        }
      } catch {
        setChannelError('Could not load channels.');
      } finally {
        setIsLoadingChannels(false);
      }
    }
    loadChannels();
  }, []);

  const handleWatch = () => setShowPlayer(true);
  const handleRefresh = async () => {
    setIsLoadingMatches(true);
    const { matches } = await loadMatches();
    setAllMatches(matches);
    setIsLoadingMatches(false);
  };

  const activeMatch = allMatches.find((m) => m.status === 'live');
  const upcomingMatches = allMatches.filter((m) => m.status === 'upcoming');
  const finishedMatches = allMatches.filter((m) => m.status === 'finished');

  const groupStandings = useMemo(() => computeGroupStandings(allMatches), [allMatches]);
  const overallStandings = useMemo(() => computeOverallStandings(allMatches), [allMatches]);
  const topScorers = useMemo(() => computeTopScorers(allMatches), [allMatches]);

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <Navigation />
      <HeroSection />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">
        {!isLoadingMatches && (
          <TodaySlider
            matches={allMatches}
            onWatch={handleWatch}
            hasLiveMatch={!!activeMatch}
          />
        )}

        {activeMatch && <LiveMatchCard match={activeMatch} onWatch={handleWatch} />}

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <span className="w-1 h-5 bg-red-400 rounded-full" />
              Live TV Stream
            </h2>
            <div className="flex items-center gap-2">
              {matchSource === 'api' && (
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingMatches}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                  title="Refresh data"
                >
                  <svg className={`w-4 h-4 ${isLoadingMatches ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              <ChannelSelector
                channels={channels}
                currentChannel={currentChannel}
                onSelect={setCurrentChannel}
                isLoading={isLoadingChannels}
              />
            </div>
          </div>

          {channelError && (
            <div className="text-amber-400/60 text-xs mb-3">{channelError}</div>
          )}

          {isLoadingMatches || isLoadingChannels ? (
            <div className="aspect-video bg-black rounded-xl border border-white/5 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-white/30 text-sm">
                  {isLoadingChannels ? 'Loading channels...' : 'Loading matches...'}
                </span>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-black rounded-xl border border-white/5 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white/30 text-sm">
                  {currentChannel ? `Click to start watching ${currentChannel.name}` : 'Select a channel'}
                </span>
                {currentChannel && (
                  <button
                    onClick={handleWatch}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold text-sm hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-500/20"
                  >
                    Watch Now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {!isLoadingMatches && (
          <>
            <UpcomingMatches matches={upcomingMatches} />
            <PreviousResults matches={finishedMatches} />
            <GroupStandings groups={groupStandings} />
            <OverallStandings standings={overallStandings} />
            <TopScorers scorers={topScorers} />
          </>
        )}
      </section>

      {showPlayer && currentChannel && (
        <VideoPlayer
          channel={currentChannel}
          onClose={() => setShowPlayer(false)}
        />
      )}

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-white/30 text-xs">
              KICKNOW26 &mdash; Unofficial FIFA World Cup 2026 Streaming
            </span>
            <div className="flex items-center gap-3">
              {matchSource === 'api' && (
                <span className="text-green-500/40 text-xs">Live data</span>
              )}
              <p className="text-white/20 text-xs">
                Powered by IPTV &middot; Not affiliated with FIFA
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
