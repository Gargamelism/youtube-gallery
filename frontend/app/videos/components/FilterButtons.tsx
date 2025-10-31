'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchAndTagFilter } from '@/components/ui/SearchAndTagFilter';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { ScrollMode } from '@/lib/scrollMode';
import { NotInterestedFilter } from '@/types';

interface FilterButtonsProps {
  totalCount: number;
  watchedCount: number;
  unwatchedCount: number;
  notInterestedCount: number;
  onScrollModeChange?: (mode: ScrollMode) => void;
}

interface Filter {
  name: string;
  label: string;
  count: number;
}

export function FilterButtons({
  totalCount,
  watchedCount,
  unwatchedCount,
  notInterestedCount,
  onScrollModeChange,
}: FilterButtonsProps) {
  const { t } = useTranslation('videos');
  const {
    filter,
    selectedTags,
    tagMode,
    searchQuery,
    notInterestedFilter,
    updateFilter,
    updateTags,
    updateTagMode,
    updateSearchQuery,
    updateNotInterestedFilter,
  } = useVideoFilters();

  const watchFilters: Filter[] = [
    { name: 'unwatched', label: t('unwatched'), count: unwatchedCount },
    { name: 'watched', label: t('watched'), count: watchedCount },
    { name: 'all', label: t('allVideos'), count: totalCount },
  ];

  const notInterestedFilters: Filter[] = [
    { name: NotInterestedFilter.EXCLUDE, label: t('hideNotInterested'), count: 0 },
    { name: NotInterestedFilter.ONLY, label: t('notInterested'), count: notInterestedCount },
    { name: NotInterestedFilter.INCLUDE, label: t('includeNotInterested'), count: 0 },
  ];

  useEffect(() => {
    updateFilter(filter);
  }, []);

  return (
    <div className="FilterButton__wrapper space-y-4 mb-6">
      <div className="FilterButton__watch-status flex flex-wrap gap-4">
        {watchFilters.map(filterConf => {
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

      <div className="FilterButton__not-interested flex flex-wrap gap-4 border-t pt-4">
        {notInterestedFilters.map(filterConf => {
          const isActive = filterConf.name === notInterestedFilter;
          return (
            <button
              onClick={() => updateNotInterestedFilter(filterConf.name as NotInterestedFilter)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 aria-selected:bg-red-100 aria-selected:text-red-700"
              aria-selected={isActive}
              key={filterConf.name}
            >
              <span>{filterConf.label}</span>
              {filterConf.count > 0 && (
                <span className="bg-opacity-20 bg-black px-2 rounded-full text-sm">{filterConf.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <SearchAndTagFilter
        searchValue={searchQuery}
        onSearchChange={updateSearchQuery}
        namespace="videos"
        selectedTags={selectedTags}
        tagMode={tagMode}
        onTagsChange={updateTags}
        onTagModeChange={updateTagMode}
        {...(onScrollModeChange && { onScrollModeChange })}
      />
    </div>
  );
}
