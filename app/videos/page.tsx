'use client';

import { VideoList } from './components/VideoList';
import { FilterButtons } from './components/FilterButtons';
import { useQuery } from '@tanstack/react-query';
import { fetchVideoStats } from '@/services/api';
import { Suspense } from 'react';

export default function VideosPage() {
  const { data: statsResponse } = useQuery({
    queryKey: ['videoStats'],
    queryFn: fetchVideoStats,
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <Suspense>
          <FilterButtons
            totalCount={statsResponse?.data?.total ?? 0}
            watchedCount={statsResponse?.data?.watched ?? 0}
            unwatchedCount={statsResponse?.data?.unwatched ?? 0}
          />
        </Suspense>
        <Suspense>
          <VideoList />
        </Suspense>
      </div>
    </main>
  );
}
