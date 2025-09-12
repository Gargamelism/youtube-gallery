'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChannelTag } from '@/types';
import { useChannelTags, useAssignChannelTags, useCreateChannelTag } from './mutations';
import { TagBadge } from './TagBadge';
import { getRandomTagColor } from '@/utils/tagHelpers';

interface TagSelectorProps {
  channelId: string;
  selectedTags: ChannelTag[];
  onTagsChange: (tags: ChannelTag[]) => void;
  onCreateTag?: () => void;
}

export function TagSelector({ channelId, selectedTags, onTagsChange, onCreateTag }: TagSelectorProps) {
  const { t } = useTranslation('tags');
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tagsResponse } = useChannelTags();
  const allTags = tagsResponse?.results || [];
  const assignMutation = useAssignChannelTags(queryClient);
  const createMutation = useCreateChannelTag(queryClient);

  const selectedTagIds = selectedTags.map(tag => tag.id);
  
  const filteredTags = allTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTagIds.includes(tag.id)
  );

  const trimmedSearchTerm = searchTerm.trim();
  const exactMatch = allTags.find(tag => 
    tag.name.toLowerCase() === trimmedSearchTerm.toLowerCase()
  );
  const shouldShowCreateOption = trimmedSearchTerm && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTagSelect = async (tag: ChannelTag) => {
    const newSelectedTags = [...selectedTags, tag];
    onTagsChange(newSelectedTags);
    
    try {
      await assignMutation.mutateAsync({
        channelId,
        tagIds: newSelectedTags.map(tagItem => tagItem.id),
      });
    } catch (error) {
      console.error('Failed to assign tag:', error);
      onTagsChange(selectedTags);
    }
    
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleTagRemove = async (tagId: string) => {
    const newSelectedTags = selectedTags.filter(tag => tag.id !== tagId);
    onTagsChange(newSelectedTags);
    
    try {
      await assignMutation.mutateAsync({
        channelId,
        tagIds: newSelectedTags.map(tagItem => tagItem.id),
      });
    } catch (error) {
      console.error('Failed to remove tag:', error);
      onTagsChange(selectedTags);
    }
  };

  const handleCreateAndAssignTag = async (tagName: string) => {
    if (!tagName.trim()) return;
    
    try {
      const newTag = await createMutation.mutateAsync({
        name: tagName.trim(),
        color: getRandomTagColor(),
        description: '',
      });
      
      await handleTagSelect(newTag);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputKeyDown = async (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      
      if (!trimmedSearchTerm) return;
      
      if (exactMatch && !selectedTagIds.includes(exactMatch.id)) {
        await handleTagSelect(exactMatch);
      } else if (filteredTags.length === 1 && filteredTags[0]) {
        await handleTagSelect(filteredTags[0]);
      } else if (shouldShowCreateOption) {
        await handleCreateAndAssignTag(trimmedSearchTerm);
      }
    }
  };

  return (
    <div className="TagSelector" ref={dropdownRef}>
      <div className="TagSelector__selected-tags flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            size="sm"
            removable
            onRemove={() => handleTagRemove(tag.id)}
          />
        ))}
      </div>

      <div className="TagSelector__input-container relative">
        <div className="flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
          <input
            ref={inputRef}
            type="text"
            className="TagSelector__search-input flex-1 px-3 py-2 text-sm border-0 focus:ring-0 focus:outline-none bg-transparent"
            placeholder={t('assignTags')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
          />
          <button
            type="button"
            className="TagSelector__dropdown-button px-3 py-2 text-gray-400 hover:text-gray-600 border-l border-gray-200"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="TagSelector__dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {onCreateTag && (
              <button
                type="button"
                onClick={() => {
                  onCreateTag();
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="TagSelector__create-option w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {searchTerm ? t('createTag') + ` "${searchTerm}"` : t('createNewTag')}
              </button>
            )}

            {filteredTags.length === 0 && !onCreateTag ? (
              <div className="TagSelector__no-options px-3 py-2 text-sm text-gray-500">
                {searchTerm ? t('noMatchingTags') : t('noTags')}
              </div>
            ) : (
              filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagSelect(tag)}
                  className="TagSelector__option w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  disabled={assignMutation.isPending}
                >
                  <TagBadge tag={tag} size="sm" />
                  {tag.description && (
                    <span className="text-xs text-gray-400 truncate">
                      {tag.description}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}