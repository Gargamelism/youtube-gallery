'use client';

import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { VideoCard } from './VideoCard';
import { LoadMoreButton } from './LoadMoreButton';
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton';
import { Video } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateVideoWatchStatus } from '@/services';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { queryKeys } from '@/lib/reactQueryConfig';
import { PAGINATION_CONFIG } from '@/lib/pagination';
import { ScrollMode } from '@/lib/storage';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

interface VideoListProps {
  scrollMode: ScrollMode;
}

export function VideoList({ scrollMode }: VideoListProps) {
  const queryClient = useQueryClient();
  const { filter, selectedTags, tagMode, areFiltersEqual } = useVideoFilters();
  const { t } = useTranslation('videos');

  const handleVideoClick = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const currentFilters = { filter, selectedTags, tagMode };

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading, error, isRestoring } = useInfiniteVideos(
    currentFilters,
    areFiltersEqual
  );

  const loadingRef = useInfiniteScroll(
    fetchNextPage,
    hasNextPage || false,
    isFetching,
    data?.pages.length || 0,
    currentFilters,
    scrollMode
  );

  const videos = data?.pages.flatMap(page => page.data?.results || []) || [];

  usePerformanceMonitor({
    category: 'video-list',
    totalVideos: videos.length,
    pagesLoaded: data?.pages.length || 0,
    isRestoring,
  });

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
      <ScrollToTopButton />

      {isRestoring && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {t('restoringPosition')}
        </div>
      )}

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
        {scrollMode === ScrollMode.MANUAL && hasNextPage && (
          <LoadMoreButton onLoadMore={() => fetchNextPage()} isLoading={isFetching} />
        )}

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
