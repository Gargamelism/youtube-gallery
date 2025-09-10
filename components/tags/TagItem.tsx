'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChannelTag } from '@/types';
import { TagBadge } from './TagBadge';

interface TagItemProps {
  tag: ChannelTag;
  isDeleting: boolean;
  onEdit: (tag: ChannelTag) => void;
  onDelete: (tagId: string) => void;
}

export function TagItem({ tag, isDeleting, onEdit, onDelete }: TagItemProps) {
  const { t } = useTranslation('tags');

  const handleEdit = () => {
    onEdit(tag);
  };

  const handleDelete = () => {
    if (!confirm(t('confirmDeleteTag'))) return;
    onDelete(tag.id);
  };

  return (
    <div className="TagItem flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3 flex-1">
        <TagBadge tag={tag} />
        <div className="flex-1">
          <div className="text-sm text-gray-500">
            {t('tagUsageCount', { count: tag.channel_count })}
          </div>
          {tag.description && (
            <div className="text-xs text-gray-400 mt-1">
              {tag.description}
            </div>
          )}
        </div>
      </div>

      <div className="TagItem__actions flex items-center gap-2">
        <button
          onClick={handleEdit}
          className="TagItem__edit-button p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label={`${t('edit')} ${tag.name}`}
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="TagItem__delete-button p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          aria-label={`${t('delete')} ${tag.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}