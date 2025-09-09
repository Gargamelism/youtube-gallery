'use client';

import { useSearchParams } from 'next/navigation';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { VideoCard } from './VideoCard';
import { Video } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchVideos, updateVideoWatchStatus } from '@/services';

export function VideoList() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const handleVideoClick = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const {
    data: videosResponse,
    isLoading,
    error: error,
  } = useQuery({
    queryKey: ['videos', filter],
    queryFn: () => fetchVideos(filter),
  });

  const { mutate: toggleWatchStatus } = useMutation({
    mutationFn: (videoId: string) => {
      const video = videosResponse?.data?.results?.find((v: Video) => v.uuid === videoId);
      return updateVideoWatchStatus(videoId, !video?.is_watched);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['videoStats'] });
    },
  });

  const videos = videosResponse?.data?.results || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
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
      </div>
    </div>
  );
}
