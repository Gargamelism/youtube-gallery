'use client';

import { TagModeType } from '@/types';
import { SearchAndTagFilter } from '@/components/ui/SearchAndTagFilter';

interface ChannelFilterBarProps {
  search: string;
  selectedTags: string[];
  tagMode: TagModeType;
  onSearchChange: (query: string) => void;
  onTagsChange: (tags: string[]) => void;
  onTagModeChange: (mode: TagModeType) => void;
  showTagFilter?: boolean;
}

export function ChannelFilterBar({
  search,
  selectedTags,
  tagMode,
  onSearchChange,
  onTagsChange,
  onTagModeChange,
  showTagFilter = true,
}: ChannelFilterBarProps) {
  return (
    <div className="ChannelFilterBar mb-6">
      <SearchAndTagFilter
        searchValue={search}
        onSearchChange={onSearchChange}
        namespace="channels"
        selectedTags={selectedTags}
        tagMode={tagMode}
        onTagsChange={onTagsChange}
        onTagModeChange={onTagModeChange}
        showTagFilter={showTagFilter}
        showScrollMode={false}
      />
    </div>
  );
}
