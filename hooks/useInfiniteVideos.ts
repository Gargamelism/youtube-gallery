'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchVideos } from '@/services';
import { TagFilterParams } from '@/types';
import { VIDEO_QUERY_CONFIG, queryKeys } from '@/lib/reactQueryConfig';
import { PAGINATION_CONFIG } from '@/lib/pagination';

export interface VideoFilters {
  watch_status?: string;
  tags?: string[];
  tag_mode?: string;
}

export function useInfiniteVideos(filters: VideoFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.videosWithFilter(filters),
    queryFn: ({ pageParam = 1 }) =>
      fetchVideos({
        ...filters,
        page: pageParam,
        page_size: PAGINATION_CONFIG.VIDEOS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data?.next) {
        const url = new URL(lastPage.data.next);
        const nextPage = url.searchParams.get('page');
        return nextPage ? parseInt(nextPage) : undefined;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...VIDEO_QUERY_CONFIG,
  });
}