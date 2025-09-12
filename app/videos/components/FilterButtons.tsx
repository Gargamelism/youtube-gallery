'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TagFilter } from '@/components/tags/TagFilter';
import { useVideoFilters } from '@/hooks/useVideoFilters';

interface FilterButtonsProps {
  totalCount: number;
  watchedCount: number;
  unwatchedCount: number;
}

interface Filter {
  name: string;
  label: string;
  count: number;
}

export function FilterButtons({ totalCount, watchedCount, unwatchedCount }: FilterButtonsProps) {
  const { t } = useTranslation('videos');
  const { filter, selectedTags, tagMode, updateFilter, updateTags, updateTagMode } = useVideoFilters();

  const filters: Filter[] = [
    { name: 'unwatched', label: t('unwatched'), count: unwatchedCount },
    { name: 'watched', label: t('watched'), count: watchedCount },
    { name: 'all', label: t('allVideos'), count: totalCount },
  ];

  useEffect(() => {
    updateFilter(filter);
  }, []);

  return (
    <div className="FilterButton__wrapper space-y-4 mb-6">
      <div className="FilterButton__watch-status flex flex-wrap gap-4">
        {filters.map(filterConf => {
          const isActive = filterConf.name === filter;
          return (
            <button
              onClick={() => updateFilter(filterConf.name)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 aria-selected:bg-blue-600 aria-selected:text-white"
              aria-selected={isActive}
              key={filterConf.name}
            >
              <span>{filterConf.label}</span>
              <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">{filterConf.count}</span>
            </button>
          );
        })}
      </div>
      
      <div className="FilterButton__tags">
        <TagFilter
          selectedTags={selectedTags}
          tagMode={tagMode}
          onTagsChange={updateTags}
          onTagModeChange={updateTagMode}
        />
      </div>
    </div>
  );
}
