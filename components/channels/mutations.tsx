import { subscribeToChannel, unsubscribeFromChannel } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useChannelSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscribeToChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
      queryClient.invalidateQueries({ queryKey: ["allChannels"] });
    },
  });
}

export function useChannelUnsubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsubscribeFromChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
      queryClient.invalidateQueries({ queryKey: ["allChannels"] });
    },
  });
}
