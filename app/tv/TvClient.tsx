'use client';

import { useState } from 'react';
import type { StoredChannel, StreamProxy } from '@/types';
import VideoPlayer from '@/components/VideoPlayer';
import ChannelSelector from '@/components/ChannelSelector';
import { RMTV_CODE } from '@/lib/competitions';

export default function TvClient({
  channels,
  proxy,
}: {
  channels: StoredChannel[];
  proxy: StreamProxy | null;
}) {
  const [channel, setChannel] = useState<StoredChannel | null>(channels[0] ?? null);
  const [reloadKey, setReloadKey] = useState(0);

  function selectChannel(ch: StoredChannel) {
    if (ch.id === channel?.id) setReloadKey((k) => k + 1);
    else setChannel(ch);
  }

  return (
    <>
      <VideoPlayer channel={channel} proxy={proxy} reloadKey={reloadKey} />
      {channels.length > 1 && (
        <ChannelSelector
          channels={channels}
          compCode={RMTV_CODE}
          current={channel}
          onSelect={selectChannel}
        />
      )}
      {channels.length === 0 && (
        <ChannelSelector channels={[]} compCode={RMTV_CODE} current={null} onSelect={setChannel} />
      )}
    </>
  );
}
