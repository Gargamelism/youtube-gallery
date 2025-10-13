import { Channel } from '@/types';
import AvailableChannelCard from './AvailableChannelCard';

export interface AvailableChannelsProps {
  subscribedChannelIds: Set<string>;
  filteredChannels: Channel[] | undefined;
  handleSubscribe: (channelId: string) => void;
  canSubscribe: boolean;
}

export default function AvailableChannels({
  subscribedChannelIds,
  filteredChannels,
  handleSubscribe,
  canSubscribe,
}: AvailableChannelsProps) {
  return (
    <div className="ChannelSubscriptions__available-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredChannels?.map((channel: Channel) => (
        <AvailableChannelCard
          channel={channel}
          handleSubscribe={handleSubscribe}
          isSubscribed={subscribedChannelIds.has(channel.uuid)}
          canSubscribe={canSubscribe}
          key={channel.uuid}
        />
      ))}
    </div>
  );
}
