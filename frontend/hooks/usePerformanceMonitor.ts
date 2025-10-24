'use client';

import { useEffect, useRef } from 'react';
import { performanceMonitor } from '@/lib/performance';

interface UsePerformanceMonitorOptions {
  category: string;
  totalVideos: number;
  pagesLoaded: number;
  isRestoring?: boolean;
  enabled?: boolean;
}

export function usePerformanceMonitor({
  category,
  totalVideos,
  pagesLoaded,
  isRestoring = false,
  enabled = process.env.NODE_ENV === 'development',
}: UsePerformanceMonitorOptions) {
  const initialLoadRef = useRef(true);
  const restorationStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (initialLoadRef.current && totalVideos > 0) {
      performanceMonitor.endMetric(`${category}-initial-load`);
      initialLoadRef.current = false;
    }

    performanceMonitor.recordMetric(category, {
      totalVideosLoaded: totalVideos,
      pagesLoaded,
      pageLoadTime: 0,
    });
  }, [category, totalVideos, pagesLoaded, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (isRestoring && restorationStartRef.current === null) {
      restorationStartRef.current = performance.now();
      performanceMonitor.startMetric(`${category}-restoration`);
    } else if (!isRestoring && restorationStartRef.current !== null) {
      const duration = performanceMonitor.endMetric(`${category}-restoration`);
      if (duration !== null) {
        performanceMonitor.recordMetric(category, {
          scrollRestorationTime: duration,
        });
        // eslint-disable-next-line security-node/detect-crlf
        console.log(`Scroll restoration took ${duration.toFixed(2)}ms`);
      }
      restorationStartRef.current = null;
    }
  }, [isRestoring, category, enabled]);

  useEffect(() => {
    if (!enabled || initialLoadRef.current) return;

    performanceMonitor.startMetric(`${category}-initial-load`);

    return () => {
      performanceMonitor.logMetrics(category);
    };
  }, [category, enabled]);
}
