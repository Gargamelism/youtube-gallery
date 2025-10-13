import { subscribeToChannel, unsubscribeFromChannel } from '@/services';
import { QueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/reactQueryConfig';

export function useChannelSubscribe(queryClient: QueryClient) {
  return useMutation({
    mutationFn: subscribeToChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userChannels });
      queryClient.invalidateQueries({ queryKey: queryKeys.availableChannels });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });
}

export function useChannelUnsubscribe(queryClient: QueryClient) {
  return useMutation({
    mutationFn: unsubscribeFromChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userChannels });
      queryClient.invalidateQueries({ queryKey: queryKeys.availableChannels });
      queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
    },
  });
}
