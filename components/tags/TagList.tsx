'use client';

import { useTranslation } from 'react-i18next';
import { ChannelTag } from '@/types';
import { TagItem } from './TagItem';

interface TagListProps {
  tags: ChannelTag[];
  isLoading: boolean;
  isDeletingTagId: string | null;
  onEditTag: (tag: ChannelTag) => void;
  onDeleteTag: (tagId: string) => void;
}

export function TagList({ tags, isLoading, isDeletingTagId, onEditTag, onDeleteTag }: TagListProps) {
  const { t } = useTranslation('tags');

  return (
    <div className="TagList space-y-4">
      <h4 className="TagList__title text-md font-medium text-gray-900">
        {t('tags')} ({tags.length})
      </h4>

      {isLoading ? (
        <div className="TagList__loading text-sm text-gray-500">{t('loading')}</div>
      ) : tags.length === 0 ? (
        <div className="TagList__empty text-sm text-gray-500">{t('noTags')}</div>
      ) : (
        <div className="TagList__items space-y-2">
          {tags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              isDeleting={isDeletingTagId === tag.id}
              onEdit={onEditTag}
              onDelete={onDeleteTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}