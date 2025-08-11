"use client";

import { VideoList } from "@/components/VideoList";
import { FilterButtons } from "@/components/FilterButtons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVideos, updateVideoWatchStatus, fetchVideoStats } from "@/services/api";
import { Video } from "@/types";

import { useSearchParams } from "next/navigation";

export default function Home() {
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";

  const {
    data: videosResponse,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["videos", filter],
    queryFn: () => fetchVideos(filter),
  });

  const { data: statsResponse } = useQuery({
    queryKey: ["videoStats"],
    queryFn: fetchVideoStats,
  });

  const { mutate: toggleWatchStatus } = useMutation({
    mutationFn: (videoId: string) => {
      const video = videosResponse?.data?.results?.find((v: Video) => v.id === videoId);
      return updateVideoWatchStatus(videoId, !video?.watched);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["videoStats"] });
    },
  });

  const handleWatchVideo = (videoId: string) => {
    toggleWatchStatus(videoId);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Video Gallery</h1>
        <FilterButtons
          totalCount={statsResponse?.data?.total ?? 0}
          watchedCount={statsResponse?.data?.watched ?? 0}
          unwatchedCount={statsResponse?.data?.unwatched ?? 0}
        />
        <VideoList
          videos={videosResponse?.data.results ?? []}
          isLoading={isLoading}
          error={queryError instanceof Error ? queryError.message : null}
          onWatchVideo={handleWatchVideo}
        />
      </div>
    </main>
  );
}
