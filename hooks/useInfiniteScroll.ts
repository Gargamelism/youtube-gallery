'use client';

import { useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useScrollPosition } from './useScrollPosition';
import { VideoFilters } from './useVideoFilters';
import { ScrollMode, DEFAULT_SCROLL_MODE } from '@/lib/storage';

export function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean,
  isFetching: boolean,
  currentPageCount: number,
  filters: VideoFilters,
  mode: ScrollMode = DEFAULT_SCROLL_MODE
) {
  const observerRef = useRef<IntersectionObserver>();
  const loadingRef = useRef<HTMLDivElement>(null);
  const { savePosition } = useScrollPosition('videos');

  const saveCurrentPosition = useDebouncedCallback(() => {
    savePosition({
      scrollY: window.scrollY,
      loadedPages: currentPageCount,
      timestamp: Date.now(),
      filters
    });
  }, 1000);

  // Save on scroll
  useEffect(() => {
    const handleScroll = () => saveCurrentPosition();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      saveCurrentPosition.cancel();
    };
  }, [saveCurrentPosition]);

  // Save immediately when filters change (not on page count changes)
  useEffect(() => {
    savePosition({
      scrollY: window.scrollY,
      loadedPages: currentPageCount,
      timestamp: Date.now(),
      filters
    });
  }, [filters, savePosition]);

  useEffect(() => {
    if (mode !== ScrollMode.AUTO || !loadingRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadingRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching, mode]);

  return loadingRef;
}