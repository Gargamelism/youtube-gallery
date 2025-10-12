import { ExternalLink, Trash2 } from 'lucide-react';
import { UserChannel } from '@/types';
import { useTranslation } from 'react-i18next';
import { TagSelector } from '@/components/tags';

export interface SubscribedChannelProps {
  userChannel: UserChannel;
  handleChannelUnsubscribe: (channelId: string) => void;
  canUnsubscribe: boolean;
  onTagsChange: () => void;
}

export default function SubscribedChannel({
  userChannel,
  handleChannelUnsubscribe,
  canUnsubscribe,
  onTagsChange,
}: SubscribedChannelProps) {
  const { t } = useTranslation('channels');

  return (
    <div
      key={userChannel.id}
      className="ChannelSubscriptions__card bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow"
    >
      <div className="ChannelSubscriptions__card-header flex items-start justify-between mb-4">
        <div className="ChannelSubscriptions__card-info flex-1">
          <h3 className="ChannelSubscriptions__card-title text-lg font-semibold text-gray-900 mb-1">
            {userChannel.channel_title}
          </h3>
          <p className="ChannelSubscriptions__card-id text-sm text-gray-500">{userChannel.channel_id}</p>
        </div>
        <button
          onClick={() => handleChannelUnsubscribe(userChannel.id)}
          disabled={canUnsubscribe}
          className="ChannelSubscriptions__unsubscribe-button p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title={t('unsubscribe')}
        >
          <Trash2 className="ChannelSubscriptions__unsubscribe-icon h-4 w-4" />
        </button>
      </div>

      <div className="ChannelSubscriptions__card-meta text-sm text-gray-500 mb-4">
        {t('subscribedOn')} {new Date(userChannel.subscribed_at).toLocaleDateString()}
      </div>

      <div className="ChannelSubscriptions__card-tag-selector mb-4">
        <TagSelector channelId={userChannel.id} selectedTags={userChannel.tags || []} onTagsChange={onTagsChange} />
      </div>

      <a
        href={`https://youtube.com/channel/${userChannel.channel_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ChannelSubscriptions__card-link inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
      >
        <ExternalLink className="ChannelSubscriptions__card-link-icon h-4 w-4 mr-1" />
        {t('viewOnYoutube')}
      </a>
    </div>
  );
}
