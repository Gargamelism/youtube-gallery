'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SkeletonGrid, VideoCardSkeleton } from '@/components/ui';
import { VideoCard } from './VideoCard';
import { LoadMoreButton } from './LoadMoreButton';
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Video } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateVideoWatchStatus, updateVideoNotInterested } from '@/services';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { useInfiniteVideos } from '@/hooks/useInfiniteVideos';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { queryKeys } from '@/lib/reactQueryConfig';
import { PAGINATION_CONFIG } from '@/lib/pagination';
import { ScrollMode } from '@/lib/scrollMode';
import { navigateWithUpdatedParams } from '@/utils/urlHelpers';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

interface VideoListProps {
  scrollMode: ScrollMode;
}

export function VideoList({ scrollMode }: VideoListProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filter, selectedTags, tagMode, searchQuery, notInterestedFilter, areFiltersEqual } = useVideoFilters();
  const { t } = useTranslation('videos');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);

  const currentFilters = { filter, selectedTags, tagMode, searchQuery, notInterestedFilter };

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

  const { mutate: toggleNotInterested } = useMutation({
    mutationFn: ({ videoId, isNotInterested }: { videoId: string; isNotInterested: boolean }) => {
      return updateVideoNotInterested(videoId, isNotInterested);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });

  useEffect(() => {
    const playerParam = searchParams.get('player');
    const timeParam = searchParams.get('t');

    if (playerParam) {
      if (selectedVideo?.uuid !== playerParam) {
        const video = videos.find(videoItem => videoItem.uuid === playerParam);
        if (video) {
          setSelectedVideo(video);
          setStartTime(timeParam ? parseInt(timeParam, 10) : undefined);
        }
      }
    } else if (selectedVideo) {
      setSelectedVideo(null);
      setStartTime(0);
    }
  }, [searchParams, videos, selectedVideo]);

  const updatePlayerInURL = (videoId: string | null, currentTime?: number) => {
    const updates: Record<string, string | undefined> = {};

    if (videoId) {
      updates.player = videoId;
      if (currentTime !== undefined && currentTime > 0) {
        updates.t = Math.floor(currentTime).toString();
      }
    } else {
      updates.player = undefined;
      updates.t = undefined;
    }

    navigateWithUpdatedParams(router, pathname, searchParams, updates);
  };

  const handleOpenPlayer = (video: Video) => {
    setSelectedVideo(video);
    setStartTime(undefined);
    updatePlayerInURL(video.uuid);
  };

  const handleClosePlayer = () => {
    setSelectedVideo(null);
    setStartTime(undefined);
    updatePlayerInURL(null);
  };

  const handleTimeUpdate = (currentTime: number) => {
    if (selectedVideo && currentTime > 0 && Math.floor(currentTime) % 10 === 0) {
      updatePlayerInURL(selectedVideo.uuid, currentTime);
    }
  };

  const handleWatchStatusChange = (isWatched: boolean) => {
    if (isWatched && selectedVideo) {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <SkeletonGrid count={PAGINATION_CONFIG.VIDEOS_PAGE_SIZE} cardSkeleton={<VideoCardSkeleton />} />
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
            onWatch={() => handleOpenPlayer(video)}
            onToggleWatched={() => toggleWatchStatus(video.uuid)}
            onToggleNotInterested={isNotInterested => toggleNotInterested({ videoId: video.uuid, isNotInterested })}
            notInterestedFilter={notInterestedFilter}
          />
        ))}

        {isFetching && <SkeletonGrid count={PAGINATION_CONFIG.VIDEOS_PAGE_SIZE} cardSkeleton={<VideoCardSkeleton />} />}
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

      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          startTime={startTime}
          onClose={handleClosePlayer}
          onWatchStatusChange={handleWatchStatusChange}
          onTimeUpdate={handleTimeUpdate}
        />
      )}
    </div>
  );
}
