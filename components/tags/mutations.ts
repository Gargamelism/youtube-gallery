import {
  fetchChannelTags,
  createChannelTag,
  updateChannelTag,
  deleteChannelTag,
  assignChannelTags,
  fetchChannelTagsById,
  fetchVideosWithTags,
} from '@/services';
import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { ChannelTag, TagCreateRequest, TagFilterParams } from '@/types';

export function useChannelTags() {
  return useQuery({
    queryKey: ['channelTags'],
    queryFn: fetchChannelTags,
  });
}

export function useChannelTagsById(channelId: string) {
  return useQuery({
    queryKey: ['channelTags', channelId],
    queryFn: () => fetchChannelTagsById(channelId),
    enabled: Boolean(channelId),
  });
}

export function useVideosWithTags(params: TagFilterParams) {
  return useQuery({
    queryKey: ['videos', 'tagged', params],
    queryFn: () => fetchVideosWithTags(params),
    enabled: Boolean(params.tags?.length || params.watch_status),
  });
}

export function useCreateChannelTag(queryClient: QueryClient) {
  return useMutation({
    mutationFn: createChannelTag,
    onSuccess: (newTag: ChannelTag) => {
      queryClient.invalidateQueries({ queryKey: ['channelTags'] });
      queryClient.setQueryData(['channelTags'], (oldData: ChannelTag[] | undefined) => {
        if (!oldData) return [newTag];
        return [...oldData, newTag];
      });
    },
  });
}

export function useUpdateChannelTag(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<TagCreateRequest> }) =>
      updateChannelTag(id, updates),
    onSuccess: (updatedTag: ChannelTag) => {
      queryClient.invalidateQueries({ queryKey: ['channelTags'] });
      queryClient.setQueryData(['channelTags'], (oldData: ChannelTag[] | undefined) => {
        if (!oldData) return [updatedTag];
        return oldData.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag));
      });
    },
  });
}

export function useDeleteChannelTag(queryClient: QueryClient) {
  return useMutation({
    mutationFn: deleteChannelTag,
    onMutate: async (tagId: string) => {
      await queryClient.cancelQueries({ queryKey: ['channelTags'] });

      const previousData = queryClient.getQueryData(['channelTags']);

      queryClient.setQueryData(['channelTags'], (oldData: ChannelTag[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((tag) => tag.id !== tagId);
      });

      return { previousData, tagId };
    },
    onError: (err, tagId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['channelTags'], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channelTags'] });
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useAssignChannelTags(queryClient: QueryClient) {
  return useMutation({
    mutationFn: ({ channelId, tagIds }: { channelId: string; tagIds: string[] }) =>
      assignChannelTags(channelId, tagIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channelTags', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['userChannels'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}