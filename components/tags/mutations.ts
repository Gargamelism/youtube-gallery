import {
  fetchChannelTags,
  createChannelTag,
  updateChannelTag,
  deleteChannelTag,
  assignChannelTags,
  fetchChannelTagsById,
  fetchVideos,
} from '@/services';
import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { ChannelTag, ChannelTagResponse, TagCreateRequest, TagFilterParams } from '@/types';
import { TAG_QUERY_CONFIG, VIDEO_QUERY_CONFIG, queryKeys } from '@/lib/react-query-config';

export function useChannelTags() {
  return useQuery({
    queryKey: queryKeys.channelTags,
    queryFn: async () => {
      const response = await fetchChannelTags();
      return response.data || {};
    },
    ...TAG_QUERY_CONFIG,
  });
}

export function useChannelTagsById(channelId: string) {
  return useQuery({
    queryKey: queryKeys.channelTagsById(channelId),
    queryFn: async () => {
      const response = await fetchChannelTagsById(channelId);
      return response.data;
    },
    enabled: Boolean(channelId),
    ...TAG_QUERY_CONFIG,
  });
}

export function useVideosWithTags(params: TagFilterParams) {
  return useQuery({
    queryKey: queryKeys.videosWithFilter(params),
    queryFn: async () => {
      const response = await fetchVideos(params);
      return response.data;
    },
    enabled: Boolean(params.tags?.length || params.watch_status),
    ...VIDEO_QUERY_CONFIG,
  });
}

export function useCreateChannelTag(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (tagData: TagCreateRequest) => {
      const response = await createChannelTag(tagData);
      return response.data;
    },
    onSuccess: (newTag: ChannelTag) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelTags });
      queryClient.setQueryData(queryKeys.channelTags, (oldData: ChannelTagResponse) => {
        if (!oldData || !oldData.results) return { results: [newTag] };
        return {
          ...oldData,
          results: [...oldData.results, newTag]
        };
      });
    },
  });
}

export function useUpdateChannelTag(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TagCreateRequest> }) => {
      const response = await updateChannelTag(id, updates);
      return response.data;
    },
    onSuccess: (updatedTag: ChannelTag) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelTags });
      queryClient.setQueryData(queryKeys.channelTags, (oldData: ChannelTagResponse) => {
        if (!oldData || !oldData.results) return { results: [updatedTag] };
        return {
          ...oldData,
          results: oldData.results.map((tag: ChannelTag) => (tag.id === updatedTag.id ? updatedTag : tag))
        };
      });
    },
  });
}

export function useDeleteChannelTag(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async (tagId: string) => {
      const response = await deleteChannelTag(tagId);
      return response.data;
    },
    onMutate: async (tagId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.channelTags });

      const previousData = queryClient.getQueryData(queryKeys.channelTags);

      queryClient.setQueryData(queryKeys.channelTags, (oldData: ChannelTagResponse) => {
        if (!oldData || !oldData.results) return oldData;
        return {
          ...oldData,
          results: oldData.results.filter((tag: ChannelTag) => tag.id !== tagId)
        };
      });

      return { previousData, tagId };
    },
    onError: (err, tagId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.channelTags, context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelTags });
      queryClient.invalidateQueries({ queryKey: queryKeys.userChannels });
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
    },
  });
}

export function useAssignChannelTags(queryClient: QueryClient) {
  return useMutation({
    mutationFn: async ({ channelId, tagIds }: { channelId: string; tagIds: string[] }) => {
      const response = await assignChannelTags(channelId, tagIds);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channelTagsById(variables.channelId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userChannels });
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
    },
  });
}