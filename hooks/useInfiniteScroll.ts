'use client';

import { useEffect, useRef } from 'react';

export function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean,
  isFetching: boolean
) {
  const observerRef = useRef<IntersectionObserver>();
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadingRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadingRef.current);

    return () => observerRef.current?.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching]);

  return loadingRef;
}