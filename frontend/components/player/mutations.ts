import { QueryClient, useMutation } from '@tanstack/react-query';
import { updateVideoWatchProgress, updateVideoWatchStatus } from '@/services/videos';
import { queryKeys } from '@/lib/reactQueryConfig';
import { WatchProgressUpdate } from '@/types';

export function useUpdateWatchProgress(queryClient: QueryClient, videoId: string) {
  return useMutation({
    mutationFn: (data: WatchProgressUpdate) => updateVideoWatchProgress(videoId, data),
    onSuccess: (response) => {
      if (response.data?.auto_marked) {
        queryClient.invalidateQueries({ queryKey: queryKeys.videos });
        queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
      }
    },
  });
}

export function useMarkAsWatched(queryClient: QueryClient, videoId: string) {
  return useMutation({
    mutationFn: (isWatched: boolean) => updateVideoWatchStatus(videoId, isWatched),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });
}
