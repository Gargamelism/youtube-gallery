'use client';

import { useCallback } from 'react';
import { VideoFilters } from '@/types';
import { storage } from '@/lib/storage';

interface ScrollPosition {
  scrollY: number;
  loadedPages: number;
  timestamp: number;
  filters: VideoFilters;
}

const POSITION_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

export function useScrollPosition(key: string) {
  const savePosition = useCallback((position: ScrollPosition) => {
    try {
      storage.setScrollPosition(key, position);
    } catch (error) {
      console.warn('Failed to save scroll position:', error);
    }
  }, [key]);

  const getPosition = useCallback((): ScrollPosition | null => {
    try {
      const position = storage.getScrollPosition(key);
      if (!position) return null;

      if (Date.now() - position.timestamp > POSITION_EXPIRY_TIME) {
        storage.removeScrollPosition(key);
        return null;
      }

      return position;
    } catch (error) {
      console.warn('Failed to get scroll position:', error);
      return null;
    }
  }, [key]);

  const clearPosition = useCallback(() => {
    try {
      storage.removeScrollPosition(key);
    } catch (error) {
      console.warn('Failed to clear scroll position:', error);
    }
  }, [key]);

  return { savePosition, getPosition, clearPosition };
}