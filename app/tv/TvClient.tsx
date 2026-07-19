'use client';

import { useState } from 'react';
import type { StoredChannel } from '@/types';
import VideoPlayer from '@/components/VideoPlayer';
import ChannelSelector from '@/components/ChannelSelector';
import { RMTV_CODE } from '@/lib/competitions';

export default function TvClient({ channels }: { channels: StoredChannel[] }) {
  const [channel, setChannel] = useState<StoredChannel | null>(channels[0] ?? null);

  return (
    <>
      <VideoPlayer channel={channel} />
      {channels.length > 1 && (
        <ChannelSelector
          channels={channels}
          compCode={RMTV_CODE}
          current={channel}
          onSelect={setChannel}
        />
      )}
      {channels.length === 0 && (
        <ChannelSelector channels={[]} compCode={RMTV_CODE} current={null} onSelect={setChannel} />
      )}
    </>
  );
}
