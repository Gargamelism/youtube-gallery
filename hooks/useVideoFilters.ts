'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TagMode, TagModeType } from '@/types';
import { navigateWithUpdatedParams } from '@/utils/urlHelpers';

export interface VideoFilters {
  filter: string;
  selectedTags: string[];
  tagMode: TagModeType;
}

export interface VideoFiltersActions {
  updateFilter: (newFilter: string) => void;
  updateTags: (newTags: string[]) => void;
  updateTagMode: (newMode: TagModeType) => void;
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

  // Helper function to update URL with current state
  const updateUrl = (updates: Record<string, string | string[] | undefined>) => {
    navigateWithUpdatedParams(router, pathname, searchParams, updates);
  };

  const updateFilter = (newFilter: string) => {
    updateUrl({
      filter: newFilter,
      tags: selectedTags,
      tag_mode: selectedTags.length > 1 ? tagMode : undefined
    });
  };

  const updateTags = (newTags: string[]) => {
    updateUrl({
      filter: filter,
      tags: newTags,
      tag_mode: newTags.length > 1 ? tagMode : undefined
    });
  };

  const updateTagMode = (newMode: TagModeType) => {
    updateUrl({
      filter: filter,
      tags: selectedTags,
      tag_mode: selectedTags.length > 1 ? newMode : undefined
    });
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
    return (
      filter === otherFilters.filter &&
      JSON.stringify(selectedTags.sort()) === JSON.stringify(otherFilters.selectedTags.sort()) &&
      tagMode === otherFilters.tagMode
    );
  };

  return {
    filter,
    selectedTags,
    tagMode,
    updateFilter,
    updateTags,
    updateTagMode,
    addTag,
    removeTag,
    areFiltersEqual,
  };
}