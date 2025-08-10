"use client";

import { VideoList } from "@/components/VideoList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVideos, updateVideoWatchStatus } from "@/services/api";
import { Video } from "@/types";

export default function Home() {
  const queryClient = useQueryClient();

  const {
    data: videosResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["videos"],
    queryFn: fetchVideos,
  });

  const { mutate: toggleWatchStatus } = useMutation({
    mutationFn: (videoId: string) => {
      const video = videosResponse?.data.results?.find((v: Video) => v.id === videoId);
      return updateVideoWatchStatus(videoId, !video?.watched);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  const handleWatchVideo = (videoId: string) => {
    toggleWatchStatus(videoId);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Video Gallery</h1>
        <VideoList
          videos={videosResponse?.data.results ?? []}
          isLoading={isLoading}
          error={error}
          onWatchVideo={handleWatchVideo}
        />
      </div>
    </main>
  );
}
