'use client';

import { useTranslation } from 'react-i18next';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
}

export function LoadMoreButton({ onLoadMore, isLoading }: LoadMoreButtonProps) {
  const { t } = useTranslation('videos');

  return (
    <button
      onClick={onLoadMore}
      disabled={isLoading}
      aria-label={t('loadMoreAriaLabel')}
      className="LoadMoreButton__button px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isLoading && (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      )}
      {isLoading ? t('loadingMore') : t('loadMore')}
    </button>
  );
}
