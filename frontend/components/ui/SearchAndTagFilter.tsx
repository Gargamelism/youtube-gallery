'use client';

import { TagModeType } from '@/types';
import { SearchInput } from './SearchInput';
import { TagFilter } from '@/components/tags/TagFilter';
import { ScrollMode } from '@/lib/scrollMode';

interface SearchAndTagFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  namespace: string;
  selectedTags: string[];
  tagMode: TagModeType;
  onTagsChange: (tags: string[]) => void;
  onTagModeChange: (mode: TagModeType) => void;
  showTagFilter?: boolean;
  showScrollMode?: boolean;
  onScrollModeChange?: (mode: ScrollMode) => void;
}

export function SearchAndTagFilter({
  searchValue,
  onSearchChange,
  namespace,
  selectedTags,
  tagMode,
  onTagsChange,
  onTagModeChange,
  showTagFilter = true,
  showScrollMode = true,
  onScrollModeChange,
}: SearchAndTagFilterProps) {
  return (
    <div className="SearchAndTagFilter space-y-4">
      <div className="SearchAndTagFilter__search">
        <SearchInput value={searchValue} onChange={onSearchChange} namespace={namespace} />
      </div>

      {showTagFilter && (
        <div className="SearchAndTagFilter__tags">
          <TagFilter
            selectedTags={selectedTags}
            tagMode={tagMode}
            onTagsChange={onTagsChange}
            onTagModeChange={onTagModeChange}
            showScrollMode={showScrollMode}
            onScrollModeChange={onScrollModeChange}
          />
        </div>
      )}
    </div>
  );
}
