'use client';

import { useEffect, useState, useRef } from 'react';
import { useInfiniteQuery, InfiniteQueryObserverResult } from '@tanstack/react-query';
import { fetchVideos } from '@/services';
import { VIDEO_QUERY_CONFIG, queryKeys } from '@/lib/reactQueryConfig';
import { PAGINATION_CONFIG } from '@/lib/pagination';
import { useScrollPosition } from './useScrollPosition';
import { VideoFilters } from '@/types';

async function restoreScrollPosition(
  position: { scrollY: number; loadedPages: number },
  fetchNextPage: () => Promise<InfiniteQueryObserverResult>
) {
  // Load pages up to saved position
  for (let i = 1; i < position.loadedPages; i++) {
    await fetchNextPage();
  }

  // Restore scroll position with a small delay to ensure content is rendered
  setTimeout(() => {
    window.scrollTo({ top: position.scrollY, behavior: 'instant' });
  }, 100);
}

export function useInfiniteVideos(filters: VideoFilters, areFiltersEqual: (otherFilters: VideoFilters) => boolean) {
  const { getPosition } = useScrollPosition('videos');
  const [isRestoring, setIsRestoring] = useState(false);
  const prevFiltersRef = useRef(filters);

  // Reset restoration flag when filters change
  if (!areFiltersEqual(prevFiltersRef.current)) {
    prevFiltersRef.current = filters;
  }

  const query = useInfiniteQuery({
    queryKey: queryKeys.videosWithFilter(filters),
    queryFn: ({ pageParam = 1 }) =>
      fetchVideos({
        ...filters,
        page: pageParam,
        page_size: PAGINATION_CONFIG.VIDEOS_PAGE_SIZE,
      }),
    getNextPageParam: lastPage => {
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

  // Restore scroll position after initial load (only once per filter set)
  useEffect(() => {
    const savedPosition = getPosition();
    if (savedPosition) {
      setIsRestoring(true);
      restoreScrollPosition(savedPosition, query.fetchNextPage).finally(() => {
        setTimeout(() => setIsRestoring(false), 500);
      });
    }
  }, []);

  return { ...query, isRestoring };
}
