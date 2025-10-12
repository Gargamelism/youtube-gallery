import { ExternalLink } from 'lucide-react';
import { Channel } from '@/types';
import { useTranslation } from 'react-i18next';

export interface AvailableChannelCardProps {
  channel: Channel;
  handleSubscribe: (channelId: string) => void;
  isSubscribed: boolean;
  canSubscribe: boolean;
}

export default function AvailableChannelCard({
  channel,
  handleSubscribe,
  isSubscribed,
  canSubscribe,
}: AvailableChannelCardProps) {
  const { t } = useTranslation('channels');

  return (
    <div
      key={channel.uuid}
      className="ChannelSubscriptions__available-card bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow"
    >
      <div className="ChannelSubscriptions__available-header flex items-start justify-between mb-4">
        <div className="ChannelSubscriptions__available-info flex-1">
          <h3 className="ChannelSubscriptions__available-title text-lg font-semibold text-gray-900 mb-1">
            {channel.title}
          </h3>
          <p className="ChannelSubscriptions__available-id text-sm text-gray-500 mb-2">{channel.channel_id}</p>
          {channel.description && (
            <p className="ChannelSubscriptions__available-description text-sm text-gray-600 line-clamp-2">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      <div className="ChannelSubscriptions__available-stats text-sm text-gray-500 mb-4">
        <div className="ChannelSubscriptions__stats-item">
          {t('channelVideosCount', { count: channel.total_videos })}{' '}
        </div>
      </div>

      <div className="ChannelSubscriptions__available-actions flex items-center justify-between">
        <a
          href={`https://youtube.com/channel/${channel.channel_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ChannelSubscriptions__external-link inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
        >
          <ExternalLink className="ChannelSubscriptions__external-icon h-4 w-4 mr-1" />
          {t('viewOnYoutube')}
        </a>

        {/* this is a UX dsiction whether to show the channel "subscribed" or hide it completely */}
        {isSubscribed ? (
          <span className="ChannelSubscriptions__subscribed-badge px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            Subscribed
          </span>
        ) : (
          <button
            onClick={() => handleSubscribe(channel.uuid)}
            disabled={canSubscribe}
            className="ChannelSubscriptions__subscribe-button px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {t('subscribe')}
          </button>
        )}
      </div>
    </div>
  );
}
