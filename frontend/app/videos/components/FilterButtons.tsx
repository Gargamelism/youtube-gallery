'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchAndTagFilter } from '@/components/ui/SearchAndTagFilter';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { ScrollMode } from '@/lib/scrollMode';
import { NotInterestedFilter } from '@/types';
import { SortSelector } from './SortSelector';

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
    sort,
    shorterThan,
    longerThan,
    isShort,
    updateFilter,
    updateTags,
    updateTagMode,
    updateSearchQuery,
    updateNotInterestedFilter,
    updateSort,
    updateShorterThan,
    updateLongerThan,
    updateIsShort,
  } = useVideoFilters();

  const watchFilters: Filter[] = [
    { name: 'unwatched', label: t('unwatched'), count: unwatchedCount },
    { name: 'watched', label: t('watched'), count: watchedCount },
    { name: 'all', label: t('allVideos'), count: totalCount },
  ];

  const shortsOptions: { value: boolean | undefined; label: string }[] = [
    { value: undefined, label: t('shortsFilter.all') },
    { value: true, label: t('shortsFilter.only') },
    { value: false, label: t('shortsFilter.hide') },
  ];

  const notInterestedFilters: Filter[] = [
    { name: NotInterestedFilter.EXCLUDE, label: t('hideNotInterested'), count: 0 },
    { name: NotInterestedFilter.ONLY, label: t('notInterested'), count: notInterestedCount },
    { name: NotInterestedFilter.INCLUDE, label: t('includeNotInterested'), count: 0 },
  ];

  const handleShorterThanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    const newShorterThan = value > 0 ? value : undefined;
    updateShorterThan(newShorterThan);
    if (newShorterThan !== undefined && longerThan !== undefined && longerThan >= newShorterThan) {
      updateLongerThan(newShorterThan - 1 > 0 ? newShorterThan - 1 : undefined);
    }
  };

  const handleLongerThanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    const newLongerThan = value > 0 ? value : undefined;
    updateLongerThan(newLongerThan);
    if (newLongerThan !== undefined && shorterThan !== undefined && shorterThan <= newLongerThan) {
      updateShorterThan(newLongerThan + 1);
    }
  };

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

      <div className="FilterButton__duration flex flex-wrap items-center gap-6 border-t pt-4">
        <label className="FilterButton__shorter-than flex items-center gap-2 text-sm text-gray-700">
          <span>{t('durationFilter.shorterThan')}</span>
          <input
            type="number"
            min={0}
            value={shorterThan ?? ''}
            onChange={handleShorterThanChange}
            placeholder="—"
            className="w-16 px-2 py-1 rounded border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>{t('durationFilter.minutesSuffix')}</span>
        </label>
        <label className="FilterButton__longer-than flex items-center gap-2 text-sm text-gray-700">
          <span>{t('durationFilter.longerThan')}</span>
          <input
            type="number"
            min={0}
            value={longerThan ?? ''}
            onChange={handleLongerThanChange}
            placeholder="—"
            className="w-16 px-2 py-1 rounded border border-gray-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>{t('durationFilter.minutesSuffix')}</span>
        </label>
      </div>

      <div className="FilterButton__is-short flex flex-wrap gap-4 border-t pt-4">
        {shortsOptions.map(option => {
          const isActive = isShort === option.value;
          return (
            <button
              key={option.label}
              onClick={() => updateIsShort(isActive ? undefined : option.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 aria-selected:bg-blue-600 aria-selected:text-white"
              aria-selected={isActive}
            >
              {option.label}
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

      <div data-testid="sort-selector-row" className="flex items-center border-t pt-4">
        <SortSelector sort={sort ?? 'in_progress_first'} onSortChange={updateSort} />
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
