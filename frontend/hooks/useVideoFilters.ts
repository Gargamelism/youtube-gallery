'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TagMode, TagModeType, VideoFilters, NotInterestedFilter } from '@/types';
import { navigateWithUpdatedParams } from '@/utils/urlHelpers';

export interface VideoFiltersActions {
  updateFilter: (newFilter: string) => void;
  updateTags: (newTags: string[]) => void;
  updateTagMode: (newMode: TagModeType) => void;
  updateSearchQuery: (query: string) => void;
  updateNotInterestedFilter: (newFilter: NotInterestedFilter) => void;
  addTag: (tagName: string) => void;
  removeTag: (tagName: string) => void;
  areFiltersEqual: (otherFilters: VideoFilters) => boolean;
}

export function useVideoFilters(): VideoFilters & VideoFiltersActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current URL parameters
  const filter = searchParams.get('filter') || 'unwatched';
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const tagMode = (searchParams.get('tag_mode') as TagModeType) || TagMode.ANY;
  const searchQuery = searchParams.get('search') || '';
  const notInterestedFilterParam = searchParams.get('not_interested_filter');
  const notInterestedFilter =
    notInterestedFilterParam &&
    Object.values(NotInterestedFilter).includes(notInterestedFilterParam as NotInterestedFilter)
      ? (notInterestedFilterParam as NotInterestedFilter)
      : NotInterestedFilter.EXCLUDE;

  // Helper function to update URL with current state
  const updateUrl = (updates: Record<string, string | string[] | undefined>) => {
    navigateWithUpdatedParams(router, pathname, searchParams, updates);
  };

  const updateAllFilters = (newFilters: Partial<VideoFilters>) => {
    const allFilters = {
      filter,
      selectedTags,
      tag_mode: selectedTags.length > 1 ? tagMode : undefined,
      notInterestedFilter,
      ...newFilters,
    };

    updateUrl({
      filter: allFilters.filter,
      tags: allFilters.selectedTags,
      tag_mode: allFilters.selectedTags.length > 1 ? allFilters.tag_mode : undefined,
      search: allFilters.searchQuery,
      not_interested_filter: allFilters.notInterestedFilter,
    });
  };

  const updateFilter = (newFilter: string) => {
    updateAllFilters({ filter: newFilter });
  };

  const updateTags = (newTags: string[]) => {
    updateAllFilters({ selectedTags: newTags });
  };

  const updateTagMode = (newMode: TagModeType) => {
    updateAllFilters({ tagMode: newMode });
  };

  const updateSearchQuery = (query: string) => {
    updateAllFilters({ searchQuery: query });
  };

  const updateNotInterestedFilter = (newFilter: NotInterestedFilter) => {
    updateAllFilters({ notInterestedFilter: newFilter });
  };

  const addTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      const newTags = [...selectedTags, tagName];
      updateTags(newTags);
    }
  };

  const removeTag = (tagName: string) => {
    const newTags = selectedTags.filter(name => name !== tagName);
    updateTags(newTags);
  };

  const areFiltersEqual = (otherFilters: VideoFilters): boolean => {
    const areTagsEqual =
      selectedTags.length === otherFilters.selectedTags.length &&
      selectedTags.every(tag => otherFilters.selectedTags.includes(tag));

    return (
      filter === otherFilters.filter &&
      areTagsEqual &&
      tagMode === otherFilters.tagMode &&
      searchQuery === otherFilters.searchQuery &&
      notInterestedFilter === otherFilters.notInterestedFilter
    );
  };

  return {
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
    addTag,
    removeTag,
    areFiltersEqual,
  };
}
