'use client';

import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TagMode, TagModeType } from '@/types';
import { ScrollMode, getScrollMode, setScrollMode } from '@/lib/scrollMode';
import { useChannelTags } from './mutations';
import { TagBadge } from './TagBadge';

interface TagFilterProps {
  selectedTags: string[];
  tagMode: TagModeType;
  onTagsChange: (tags: string[]) => void;
  onTagModeChange: (mode: TagModeType) => void;
  showScrollMode?: boolean;
  onScrollModeChange?: ((mode: ScrollMode) => void) | undefined;
}

export function TagFilter({
  selectedTags,
  tagMode,
  onTagsChange,
  onTagModeChange,
  showScrollMode = true,
  onScrollModeChange = undefined,
}: TagFilterProps) {
  const { t } = useTranslation('tags');
  const { t: tVideos } = useTranslation('videos');
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollMode, setLocalScrollMode] = useState<ScrollMode>(ScrollMode.AUTO);
  const { data: allTags } = useChannelTags();
  const selectedTagObjects = allTags?.results?.filter(tag => selectedTags.includes(tag.name)) || [];
  const availableTags = allTags?.results?.filter(tag => !selectedTags.includes(tag.name)) || [];

  useEffect(() => {
    setLocalScrollMode(getScrollMode());
  }, []);

  const handleTagAdd = (tagName: string) => {
    onTagsChange([...selectedTags, tagName]);
  };

  const handleTagRemove = (tagName: string) => {
    onTagsChange(selectedTags.filter(name => name !== tagName));
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const handleScrollModeToggle = () => {
    const newMode = scrollMode === ScrollMode.AUTO ? ScrollMode.MANUAL : ScrollMode.AUTO;
    setScrollMode(newMode);
    setLocalScrollMode(newMode);
    onScrollModeChange?.(newMode);
  };

  return (
    <div className="TagFilter__container space-y-3">
      <div className="TagFilter__header flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="TagFilter__toggle flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <Filter className="h-4 w-4" />
          {t('filterByTags')}
          {selectedTags.length > 0 && (
            <span className="TagFilter__count bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {selectedTags.length}
            </span>
          )}
        </button>

        <div className="flex flex-col items-end gap-1">
          {showScrollMode && (
            <button
              onClick={handleScrollModeToggle}
              className="TagFilter__scroll-mode-toggle text-xs text-gray-500 hover:text-gray-700"
              aria-pressed={scrollMode === ScrollMode.MANUAL}
            >
              {scrollMode === ScrollMode.AUTO ? tVideos('scrollMode.manual') : tVideos('scrollMode.auto')}
            </button>
          )}
          {selectedTags.length > 0 && (
            <button onClick={handleClearAll} className="TagFilter__clear text-xs text-gray-500 hover:text-gray-700">
              {t('clearAll')}
            </button>
          )}
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="TagFilter__selected">
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTagObjects?.map(tag => (
              <TagBadge key={tag.id} tag={tag} size="sm" removable onRemove={() => handleTagRemove(tag.name)} />
            ))}
          </div>

          {selectedTags.length > 0 && (
            <div className="TagFilter__mode flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('showVideosFrom')}:</span>
              <button
                onClick={() => onTagModeChange(TagMode.ANY)}
                className={`
                  TagFilter__mode-button text-xs px-2 py-1 rounded
                  ${
                    tagMode === TagMode.ANY
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {t('tagMode.any')}
              </button>
              <button
                onClick={() => onTagModeChange(TagMode.ALL)}
                className={`
                  TagFilter__mode-button text-xs px-2 py-1 rounded
                  ${
                    tagMode === TagMode.ALL
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {t('tagMode.all')}
              </button>
              <button
                onClick={() => onTagModeChange(TagMode.EXCEPT)}
                className={`
                  TagFilter__mode-button text-xs px-2 py-1 rounded
                  ${
                    tagMode === TagMode.EXCEPT
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {t('tagMode.except')}
              </button>
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="TagFilter__available">
          <div className="border-t pt-3">
            <h5 className="TagFilter__available-title text-xs font-medium text-gray-700 mb-2">{t('availableTags')}:</h5>
            {(availableTags?.length || 0) === 0 ? (
              <div className="TagFilter__no-tags text-xs text-gray-500">
                {(allTags?.results?.length || 0) === 0 ? t('noTags') : t('allTagsSelected')}
              </div>
            ) : (
              <div className="TagFilter__available-list flex flex-wrap gap-2">
                {availableTags?.map(tag => (
                  <TagBadge key={tag.id} tag={tag} size="sm" onClick={() => handleTagAdd(tag.name)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
