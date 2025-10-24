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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <Suspense>
          <FilterButtons
            totalCount={statsResponse?.data?.total ?? 0}
            watchedCount={statsResponse?.data?.watched ?? 0}
            unwatchedCount={statsResponse?.data?.unwatched ?? 0}
            onScrollModeChange={setScrollMode}
          />
        </Suspense>
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
