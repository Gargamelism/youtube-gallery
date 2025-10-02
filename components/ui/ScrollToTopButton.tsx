'use client';

import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
  const { showButton, scrollToTop } = useScrollToTop({ threshold: 300 });
  const { t } = useTranslation('common');

  if (!showButton) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToTop();
    }
  };

  return (
    <button
      onClick={scrollToTop}
      onKeyDown={handleKeyDown}
      className="fixed bottom-8 right-8 z-50 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={t('scrollToTop')}
      title={t('scrollToTop')}
      tabIndex={0}
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
}
