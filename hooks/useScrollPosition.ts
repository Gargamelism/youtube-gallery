'use client';

import { useCallback } from 'react';
import { VideoFilters } from './useVideoFilters';

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
      sessionStorage.setItem(`scroll_${key}`, JSON.stringify(position));
    } catch (error) {
      console.warn('Failed to save scroll position:', error);
    }
  }, [key]);

  const getPosition = useCallback((): ScrollPosition | null => {
    try {
      const saved = sessionStorage.getItem(`scroll_${key}`);
      if (!saved) return null;

      const position = JSON.parse(saved);

      // Check if position has expired
      if (Date.now() - position.timestamp > POSITION_EXPIRY_TIME) {
        sessionStorage.removeItem(`scroll_${key}`);
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
      sessionStorage.removeItem(`scroll_${key}`);
    } catch (error) {
      console.warn('Failed to clear scroll position:', error);
    }
  }, [key]);

  return { savePosition, getPosition, clearPosition };
}