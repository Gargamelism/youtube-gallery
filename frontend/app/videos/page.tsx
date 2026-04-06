'use client';

import { VideoList } from './components/VideoList';
import { FilterButtons } from './components/FilterButtons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchVideoStats } from '@/services';
import { DEFAULT_SCROLL_MODE, ScrollMode, getScrollMode } from '@/lib/scrollMode';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { useKeyboardNavigation, KeyboardShortcutsModal, createVideoPageShortcuts } from '@/components/keyboard';
import { useVideoFilters } from '@/hooks/useVideoFilters';
import { queryKeys } from '@/lib/reactQueryConfig';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/SearchInput';

function WatchStatusTabs({
  totalCount,
  watchedCount,
  unwatchedCount,
}: {
  totalCount: number;
  watchedCount: number;
  unwatchedCount: number;
}) {
  const { t } = useTranslation('videos');
  const { filter, updateFilter } = useVideoFilters();

  const tabs = [
    { name: 'unwatched', label: t('unwatched'), count: unwatchedCount },
    { name: 'watched', label: t('watched'), count: watchedCount },
    { name: 'all', label: t('allVideos'), count: totalCount },
  ];

  return (
    <div className="WatchStatusTabs flex items-center gap-1">
      {tabs.map(tab => {
        const isActive = tab.name === filter;
        return (
          <button
            key={tab.name}
            onClick={() => updateFilter(tab.name)}
            className={`WatchStatusTabs__tab px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${isActive ? 'text-purple-500' : 'text-gray-400'}`}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function VideosPageHeader({
  totalCount,
  watchedCount,
  unwatchedCount,
}: {
  totalCount: number;
  watchedCount: number;
  unwatchedCount: number;
}) {
  const { searchQuery, updateSearchQuery } = useVideoFilters();

  return (
    <div className="VideosPage__header flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex-none w-72">
        <SearchInput value={searchQuery} onChange={updateSearchQuery} namespace="videos" />
      </div>
      <div className="flex-1">
        <WatchStatusTabs totalCount={totalCount} watchedCount={watchedCount} unwatchedCount={unwatchedCount} />
      </div>
      <h1 className="VideosPage__title text-xl font-semibold text-gray-800 flex-none">Archive Library</h1>
    </div>
  );
}

export default function VideosPage() {
  const { data: statsResponse } = useQuery({
    queryKey: queryKeys.videoStats,
    queryFn: fetchVideoStats,
  });
  const queryClient = useQueryClient();
  const { updateFilter } = useVideoFilters();

  const [scrollMode, setScrollMode] = useState<ScrollMode>(DEFAULT_SCROLL_MODE);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  useEffect(() => {
    setScrollMode(getScrollMode());
  }, []);

  const shortcuts = useMemo(
    () =>
      createVideoPageShortcuts({
        updateFilter,
        invalidateQueries: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.videos });
          queryClient.invalidateQueries({ queryKey: queryKeys.videoStats });
        },
        setShowShortcutsModal,
      }),
    [updateFilter, queryClient, setShowShortcutsModal]
  );

  useKeyboardNavigation({ shortcuts });

  const totalCount = statsResponse?.data?.total ?? 0;
  const watchedCount = statsResponse?.data?.watched ?? 0;
  const unwatchedCount = statsResponse?.data?.unwatched ?? 0;
  const notInterestedCount = statsResponse?.data?.not_interested ?? 0;

  return (
    <main className="VideosPage flex flex-col h-full">
      <Suspense>
        <VideosPageHeader totalCount={totalCount} watchedCount={watchedCount} unwatchedCount={unwatchedCount} />
      </Suspense>

      <Suspense>
        <FilterButtons notInterestedCount={notInterestedCount} onScrollModeChange={setScrollMode} />
      </Suspense>

      <div className="flex-1 overflow-y-auto px-6">
        <Suspense>
          <VideoList scrollMode={scrollMode} />
        </Suspense>
      </div>

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={shortcuts}
      />
    </main>
  );
}
