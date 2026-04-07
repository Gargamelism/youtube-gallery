'use client';

import { useTranslation } from 'react-i18next';
import { Play, Check, Calendar } from 'lucide-react';
import Image from 'next/image';
import { Video, NotInterestedFilter } from '@/types';
import { TagBadge } from '@/components/tags/TagBadge';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { getTextDirection, getTextAlign } from '@/utils/textHelpers';
import { NotInterestedButton } from './NotInterestedButton';

const MAX_DURATION_LENGTH = 20;

interface VideoCardProps {
  video: Video;
  onWatch: () => void;
  onToggleWatched: (isWatched: boolean, notes?: string) => void;
  onToggleNotInterested: (isNotInterested: boolean) => void;
  notInterestedFilter: NotInterestedFilter;
}

export function VideoCard({
  video,
  onWatch,
  onToggleWatched,
  onToggleNotInterested,
  notInterestedFilter,
}: VideoCardProps) {
  const { t } = useTranslation('videos');
  const { addTag } = useVideoFilters();

  const handleTagClick = (tagName: string) => {
    addTag(tagName);
  };

  const handleWatchedToggle = () => {
    onToggleWatched(!video.is_watched);
  };

  const handleNotInterestedClick = () => {
    onToggleNotInterested(!video.is_not_interested);
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return null;

    if (duration.length > MAX_DURATION_LENGTH || !duration.startsWith('PT')) {
      return duration;
    }

    const parts = [];
    const hourMatch = /(\d{1,4})H/.exec(duration);
    const minuteMatch = /(\d{1,4})M/.exec(duration);
    const secondMatch = /(\d{1,4})S/.exec(duration);

    if (hourMatch) parts.push(`${hourMatch[1]}h`);
    if (minuteMatch) parts.push(`${minuteMatch[1]}m`);
    if (secondMatch && !hourMatch) parts.push(`${secondMatch[1]}s`);

    return parts.length > 0 ? parts.join(' ') : duration;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const showingNotInterestedVideos =
    notInterestedFilter === NotInterestedFilter.ONLY ||
    (notInterestedFilter === NotInterestedFilter.INCLUDE && video.is_not_interested);

  const shouldDimCard = video.is_not_interested && !showingNotInterestedVideos;

  return (
    <div className="VideoCard group relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
      <NotInterestedButton
        isNotInterested={video.is_not_interested}
        notInterestedFilter={notInterestedFilter}
        onClick={handleNotInterestedClick}
      />

      <div className={`VideoCard__content flex flex-col ${shouldDimCard ? 'opacity-50' : ''}`}>
        <button
          type="button"
          onClick={onWatch}
          className="VideoCard__thumbnail w-full h-44 relative overflow-hidden cursor-pointer group/thumbnail"
        >
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="VideoCard__image object-cover"
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="VideoCard__play-overlay absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/thumbnail:opacity-100 transition-opacity">
            <Play className="VideoCard__play-icon w-12 h-12 text-white" />
          </div>

          {video.duration && (
            <div className="VideoCard__duration absolute bottom-2 right-2 bg-black/75 text-white px-1.5 py-0.5 rounded text-xs font-medium">
              {formatDuration(video.duration)}
            </div>
          )}

          {video.watch_percentage !== undefined && video.watch_percentage > 0 && (
            <div className="VideoCard__progress absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
              <div
                className="VideoCard__progress-bar h-full bg-red-500 transition-all"
                style={{ width: `${video.watch_percentage}%` }}
              />
            </div>
          )}
        </button>

        <div className="VideoCard__info flex flex-col gap-2 p-4">
          <h3
            className={`VideoCard__title text-sm font-semibold line-clamp-2 text-gray-900 ${getTextAlign(video.title)}`}
            style={{ direction: getTextDirection(video.title) }}
            title={video.title}
          >
            {video.title}
          </h3>

          <div className="VideoCard__channel text-xs text-purple-600 font-medium">{video.channel_title}</div>

          {video.channel_tags && video.channel_tags.length > 0 && (
            <div className="VideoCard__tags flex flex-wrap gap-1">
              {video.channel_tags.slice(0, 3).map(tag => (
                <TagBadge key={tag.id} tag={tag} size="sm" onClick={() => handleTagClick(tag.name)} />
              ))}
              {video.channel_tags.length > 3 && (
                <span className="VideoCard__more-tags text-xs text-gray-400 px-1.5 py-0.5">
                  +{video.channel_tags.length - 3}
                </span>
              )}
            </div>
          )}

          {video.published_at && (
            <div className="VideoCard__date flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {formatDate(video.published_at)}
            </div>
          )}

          <button
            onClick={handleWatchedToggle}
            aria-pressed={video.is_watched}
            className={`VideoCard__watch-button mt-1 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              video.is_watched
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-purple-900 text-white hover:bg-purple-800'
            }`}
          >
            <Check className="VideoCard__check-icon w-4 h-4" />
            {video.is_watched ? t('watched') : t('markAsWatched')}
          </button>
        </div>
      </div>
    </div>
  );
}
