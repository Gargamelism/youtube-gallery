import { subscribeToChannel, unsubscribeFromChannel } from '@/services/api';
import { QueryClient, useMutation } from '@tanstack/react-query';

export function useChannelSubscribe(queryClient: QueryClient) {
  return useMutation({
    mutationFn: subscribeToChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.invalidateQueries({ queryKey: ['allChannels'] });
    },
  });
}

export function useChannelUnsubscribe(queryClient: QueryClient) {
  return useMutation({
    mutationFn: unsubscribeFromChannel,
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['userChannels'] });

      const previousData = queryClient.getQueryData(['userChannels']);

      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.invalidateQueries({ queryKey: ['allChannels'] });
    },
  });
}
