'use client';

import { useTranslation } from 'react-i18next';
import { VideoSortMode, VIDEO_SORT_OPTIONS } from '@/types';

interface SortSelectorProps {
  sort: VideoSortMode;
  onSortChange: (sort: VideoSortMode) => void;
}

export const SortSelector = ({ sort, onSortChange }: SortSelectorProps) => {
  const { t } = useTranslation('videos');
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-gray-600 dark:text-gray-400">
        {t('sort.label')}
      </label>
      <select
        id="sort-select"
        value={sort}
        onChange={e => onSortChange(e.target.value as VideoSortMode)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
      >
        {VIDEO_SORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
};
