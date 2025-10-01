'use client';

import { VideoList } from './components/VideoList';
import { FilterButtons } from './components/FilterButtons';
import { useQuery } from '@tanstack/react-query';
import { fetchVideoStats } from '@/services';
import { ScrollMode, storage } from '@/lib/storage';
import { Suspense, useState, useEffect } from 'react';

export default function VideosPage() {
  const { data: statsResponse } = useQuery({
    queryKey: ['videoStats'],
    queryFn: fetchVideoStats,
  });

  const [scrollMode, setScrollMode] = useState<ScrollMode>(ScrollMode.AUTO);

  useEffect(() => {
    setScrollMode(storage.getScrollMode());
  }, []);

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
    </main>
  );
}
