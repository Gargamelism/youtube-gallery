'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TagMode, TagModeType, ChannelTag } from '@/types';
import { useChannelTags } from './mutations';
import { TagBadge } from './TagBadge';

interface TagFilterProps {
  selectedTags: string[];
  tagMode: TagModeType;
  onTagsChange: (tags: string[]) => void;
  onTagModeChange: (mode: TagModeType) => void;
}

export function TagFilter({ selectedTags, tagMode, onTagsChange, onTagModeChange }: TagFilterProps) {
  const { t } = useTranslation('tags');
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: allTags = [] } = useChannelTags();

  const selectedTagObjects = allTags.filter(tag => selectedTags.includes(tag.name));
  const availableTags = allTags.filter(tag => !selectedTags.includes(tag.name));

  const handleTagAdd = (tagName: string) => {
    onTagsChange([...selectedTags, tagName]);
  };

  const handleTagRemove = (tagName: string) => {
    onTagsChange(selectedTags.filter(name => name !== tagName));
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const handleToggleMode = () => {
    const newMode = tagMode === TagMode.ANY ? TagMode.ALL : TagMode.ANY;
    onTagModeChange(newMode);
  };

  return (
    <div className="TagFilter space-y-3">
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

        {selectedTags.length > 0 && (
          <button
            onClick={handleClearAll}
            className="TagFilter__clear text-xs text-gray-500 hover:text-gray-700"
          >
            {t('clearAll')}
          </button>
        )}
      </div>

      {selectedTags.length > 0 && (
        <div className="TagFilter__selected">
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTagObjects.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="sm"
                removable
                onRemove={() => handleTagRemove(tag.name)}
              />
            ))}
          </div>

          {selectedTags.length > 1 && (
            <div className="TagFilter__mode flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('showVideosFrom')}:</span>
              <button
                onClick={handleToggleMode}
                className={`
                  TagFilter__mode-button text-xs px-2 py-1 rounded
                  ${tagMode === TagMode.ANY 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {t('tagMode.any')}
              </button>
              <button
                onClick={handleToggleMode}
                className={`
                  TagFilter__mode-button text-xs px-2 py-1 rounded
                  ${tagMode === TagMode.ALL 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {t('tagMode.all')}
              </button>
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="TagFilter__available">
          <div className="border-t pt-3">
            <h5 className="TagFilter__available-title text-xs font-medium text-gray-700 mb-2">
              {t('availableTags')}:
            </h5>
            {availableTags.length === 0 ? (
              <div className="TagFilter__no-tags text-xs text-gray-500">
                {allTags.length === 0 ? t('noTags') : t('allTagsSelected')}
              </div>
            ) : (
              <div className="TagFilter__available-list flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    onClick={() => handleTagAdd(tag.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}