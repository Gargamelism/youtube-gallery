'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChannelTag, TagCreateRequest } from '@/types';
import { TagBadge } from './TagBadge';

interface TagFormProps {
  editingTag: ChannelTag | null;
  isSubmitting: boolean;
  onSubmit: (data: TagCreateRequest) => void;
  onCancel: () => void;
}

const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#EC4899', // pink
  '#6366F1', // indigo
] as const;

function getRandomColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]!;
}

export function TagForm({ editingTag, isSubmitting, onSubmit, onCancel }: TagFormProps) {
  const { t } = useTranslation('tags');
  const [formData, setFormData] = useState<TagCreateRequest>({
    name: editingTag?.name || '',
    color: editingTag?.color || getRandomColor(),
    description: editingTag?.description || '',
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="TagForm mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 className="TagForm__title text-md font-medium text-gray-900 mb-4">
        {editingTag ? t('editTag') : t('createTag')}
      </h4>

      <div className="space-y-4">
        <div>
          <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700">
            {t('tagName')}
          </label>
          <input
            type="text"
            id="tag-name"
            className="TagForm__name-input mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={formData.name}
            onChange={event => setFormData({ ...formData, name: event.target.value })}
            maxLength={50}
            required
          />
        </div>

        <div>
          <label htmlFor="tag-color" className="block text-sm font-medium text-gray-700">
            {t('tagColor')}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              id="tag-color"
              className="TagForm__color-picker h-10 w-16 rounded border border-gray-300 cursor-pointer"
              value={formData.color}
              onChange={event => setFormData({ ...formData, color: event.target.value })}
            />
            <input
              type="text"
              className="TagForm__color-input block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={formData.color}
              onChange={event => setFormData({ ...formData, color: event.target.value })}
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tag-description" className="block text-sm font-medium text-gray-700">
            {t('tagDescription')}
          </label>
          <textarea
            id="tag-description"
            className="TagForm__description-input mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={formData.description}
            onChange={event => setFormData({ ...formData, description: event.target.value })}
            rows={2}
          />
        </div>

        {formData.name && (
          <div className="TagForm__preview">
            <span className="block text-sm font-medium text-gray-700 mb-2">{t('preview')}:</span>
            <TagBadge
              tag={{
                id: '',
                name: formData.name,
                color: formData.color,
                description: formData.description || '',
                channel_count: 0,
                created_at: '',
              }}
            />
          </div>
        )}
      </div>

      <div className="TagForm__actions mt-4 flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !formData.name.trim()}
          className="TagForm__save-button inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '...' : t('saveTag')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="TagForm__cancel-button inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
