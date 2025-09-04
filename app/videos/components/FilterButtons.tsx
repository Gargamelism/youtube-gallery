'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'unwatched';

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };

  const handleFilterChange = (newFilter: string) => {
    router.push(pathname + '?' + createQueryString('filter', newFilter));
  };

  const filters: Filter[] = [
    { name: 'unwatched', label: t('unwatched'), count: unwatchedCount },
    { name: 'watched', label: t('watched'), count: watchedCount },
    { name: 'all', label: t('allVideos'), count: totalCount },
  ];

  useEffect(() => {
    handleFilterChange(filter);
  }, []);

  return (
    <div className="FilterButton__wrapper flex flex-wrap gap-4 mb-6">
      {filters.map(filterConf => {
        const isActive = filterConf.name === filter;
        return (
          <button
            onClick={() => handleFilterChange(filterConf.name)}
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
  );
}
