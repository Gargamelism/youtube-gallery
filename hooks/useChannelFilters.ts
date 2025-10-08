'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TagMode, TagModeType, ChannelFilters, ChannelType } from '@/types';
import { navigateWithUpdatedParams } from '@/utils/urlHelpers';
import { filtersToUrlParams, urlParamsToFilters } from '@/utils/channelUrlHelpers';

export interface ChannelFiltersActions {
  updateSearch: (query: string) => void;
  updateTags: (newTags: string[]) => void;
  updateTagMode: (newMode: TagModeType) => void;
  updatePage: (page: number) => void;
  addTag: (tagName: string) => void;
  removeTag: (tagName: string) => void;
  resetFilters: () => void;
}

/**
 * Hook for managing channel filters with URL state synchronization
 *
 * @param type - Channel type ('subscribed' or 'available')
 * @returns Current filter state and update actions
 *
 * @example
 * const subscribedFilters = useChannelFilters('subscribed');
 * const availableFilters = useChannelFilters('available');
 *
 * // URL will be: /channels?ss=tech&sts=prog&sp=2&as=python&ap=1
 */
export function useChannelFilters(type: ChannelType): ChannelFilters & ChannelFiltersActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFilters = urlParamsToFilters(searchParams, type);

  const updateUrl = (newFilters: Partial<ChannelFilters>) => {
    const urlParams = filtersToUrlParams(newFilters, type);
    navigateWithUpdatedParams(router, pathname, searchParams, urlParams);
  };

  const updateAllFilters = (updates: Partial<ChannelFilters>) => {
    const mergedFilters = { ...currentFilters, ...updates };
    updateUrl(mergedFilters);
  };

  const updateSearch = (query: string) => {
    updateAllFilters({ search: query, page: 1 });
  };

  const updateTags = (newTags: string[]) => {
    updateAllFilters({ selectedTags: newTags, page: 1 });
  };

  const updateTagMode = (newMode: TagModeType) => {
    updateAllFilters({ tagMode: newMode, page: 1 });
  };

  const updatePage = (newPage: number) => {
    updateAllFilters({ page: newPage });
  };

  const addTag = (tagName: string) => {
    if (!currentFilters.selectedTags.includes(tagName)) {
      updateTags([...currentFilters.selectedTags, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    updateTags(currentFilters.selectedTags.filter(name => name !== tagName));
  };

  const resetFilters = () => {
    updateUrl({
      search: '',
      selectedTags: [],
      tagMode: TagMode.ANY,
      page: 1,
    });
  };

  return {
    ...currentFilters,
    updateSearch,
    updateTags,
    updateTagMode,
    updatePage,
    addTag,
    removeTag,
    resetFilters,
  };
}
