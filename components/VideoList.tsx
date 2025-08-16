"use client";

import SkeletonLoader from "./SkeletonLoader";
import { VideoCard } from "./VideoCard";
import { Video } from "@/types";

interface VideoListProps {
  videos: Video[];
  onWatchVideo: (videoId: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function VideoList({ videos, onWatchVideo, isLoading, error }: VideoListProps) {
  const handleVideoClick = (url: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

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
        {videos.map((video) => (
          <VideoCard
            key={video.uuid}
            video={video}
            onWatch={() => handleVideoClick(video.video_url)}
            onMarkWatched={() => onWatchVideo(video.uuid)}
          />
        ))}
      </div>
    </div>
  );
}
