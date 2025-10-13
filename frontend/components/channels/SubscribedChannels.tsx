import { UserChannel } from '@/types';
import SubscribedChannel from './SubscribedChannelCard';

export interface SubscribedChannelsProps {
  userChannels: UserChannel[] | undefined;
  handleChannelUnsubscribe: (channelId: string) => void;
  canUnsubscribe: boolean;
  onTagsChange: () => void;
}

export default function SubscribedChannels({
  userChannels,
  handleChannelUnsubscribe,
  canUnsubscribe,
  onTagsChange,
}: SubscribedChannelsProps) {
  return (
    <div className="ChannelSubscriptions__grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {userChannels?.map((userChannel: UserChannel) => (
        <SubscribedChannel
          userChannel={userChannel}
          handleChannelUnsubscribe={handleChannelUnsubscribe}
          canUnsubscribe={canUnsubscribe}
          key={userChannel.id}
          onTagsChange={onTagsChange}
        />
      ))}
    </div>
  );
}
