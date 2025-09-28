'use client';

import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { VideoCard } from './VideoCard';
import { Video } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateVideoWatchStatus } from '@/services';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { queryKeys } from '@/lib/reactQueryConfig';
import { PAGINATION_CONFIG } from '@/lib/pagination';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export function VideoList() {
  const queryClient = useQueryClient();
  const { filter, selectedTags, tagMode } = useVideoFilters();
  const { t } = useTranslation('videos');

  const handleVideoClick = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, error } = useInfiniteVideos({
    watch_status: filter,
    tags: selectedTags,
    tag_mode: tagMode,
  });

  const loadingRef = useInfiniteScroll(fetchNextPage, hasNextPage || false, isFetching);

  const videos = data?.pages.flatMap(page => page.data?.results || []) || [];

  const { mutate: toggleWatchStatus } = useMutation({
    mutationFn: (videoId: string) => {
      const video = videos.find((v: Video) => v.uuid === videoId);
      return updateVideoWatchStatus(videoId, !video?.is_watched);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(PAGINATION_CONFIG.VIDEOS_PAGE_SIZE)].map((_, i) => (
          <SkeletonLoader key={i} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-6">
        <div className="text-center text-red-500">
          <p>Error loading videos. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map(video => (
          <VideoCard
            key={video.uuid}
            video={video}
            onWatch={() => handleVideoClick(video.video_url)}
            onToggleWatched={() => toggleWatchStatus(video.uuid)}
          />
        ))}

        {isFetching &&
          [...Array(PAGINATION_CONFIG.VIDEOS_PAGE_SIZE)].map((_, i) => <SkeletonLoader key={`loading-${i}`} />)}
      </div>

      <div ref={loadingRef} className="flex flex-col items-center gap-4 py-8">
        {!hasNextPage && videos.length > 0 && (
          <div className="text-center">
            <p className="text-gray-500 mb-4">{t('noMoreVideos')}</p>
            <Link
              href="/channels"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('subscribeToMoreChannels')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
