import { useState, useEffect, useRef } from 'react';

export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
}

interface UseScrollDirectionOptions {
  threshold?: number;
}

const DEFAULT_SCROLL_THRESHOLD_PX = 10;

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const { threshold = DEFAULT_SCROLL_THRESHOLD_PX } = options;
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const difference = scrollY - lastScrollY.current;

      if (Math.abs(difference) < threshold) {
        ticking.current = false;
        return;
      }

      setScrollDirection(difference > 0 ? ScrollDirection.DOWN : ScrollDirection.UP);
      lastScrollY.current = scrollY;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrollDirection;
}