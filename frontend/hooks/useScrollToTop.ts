import { useState, useEffect } from 'react';

interface UseScrollToTopOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export function useScrollToTop(options: UseScrollToTopOptions = {}) {
  const { threshold = 300, behavior = 'smooth' } = options;
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior });
  };

  return { showButton, scrollToTop };
}