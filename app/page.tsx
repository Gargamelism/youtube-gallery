'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVideos } from '@/services';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { VideoFilters } from '@/types';
import { TagMode, WatchStatus } from '@/types';
import { queryKeys } from '@/lib/reactQueryConfig';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();

  const filters: VideoFilters = {
    filter: WatchStatus.UNWATCHED,
    selectedTags: [],
    tagMode: TagMode.ANY,
    searchQuery: '',
  };

  const {
    isSuccess,
    isError,
    data: videosResponse,
  } = useQuery({
    queryFn: () => fetchVideos(filters),
    queryKey: queryKeys.videosWithFilter(filters),
  });

  useEffect(() => {
    if (videosResponse?.error === 'Authentication required' || pathname !== '/') {
      return;
    }
    if (isSuccess && !videosResponse?.data?.results?.length) {
      router.push('/channels');
    } else {
      router.push('/videos');
    }
  }, [isSuccess, isError, videosResponse, router]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonLoader key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
