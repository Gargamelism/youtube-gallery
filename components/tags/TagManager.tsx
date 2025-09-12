'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChannelTag, TagCreateRequest } from '@/types';
import { useChannelTags, useCreateChannelTag, useUpdateChannelTag, useDeleteChannelTag } from './mutations';
import { TagForm } from './TagForm';
import { TagList } from './TagList';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsChange: () => void;
}

export function TagManager({ isOpen, onClose, onTagsChange }: TagManagerProps) {
  if (!isOpen) return null;

  const { t } = useTranslation('tags');
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<ChannelTag | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const { data: tagsResponse, isLoading } = useChannelTags();
  const tags = tagsResponse?.results || [];
  const createMutation = useCreateChannelTag(queryClient);
  const updateMutation = useUpdateChannelTag(queryClient);
  const deleteMutation = useDeleteChannelTag(queryClient);

  const handleFormSubmit = async (formData: TagCreateRequest) => {
    try {
      if (editingTag) {
        await updateMutation.mutateAsync({
          id: editingTag.id,
          updates: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      
      handleFormCancel();
      onTagsChange();
    } catch (error) {
      console.error('Tag operation failed:', error);
    }
  };

  const handleFormCancel = () => {
    setIsCreating(false);
    setEditingTag(null);
  };

  const handleEditTag = (tag: ChannelTag) => {
    setEditingTag(tag);
    setIsCreating(true);
  };

  const handleDeleteTag = async (tagId: string) => {
    setDeletingTagId(tagId);
    try {
      await deleteMutation.mutateAsync(tagId);
      onTagsChange();
    } catch (error) {
      console.error('Tag deletion failed:', error);
    } finally {
      setDeletingTagId(null);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="TagManager fixed inset-0 z-50 overflow-y-auto">
      <div className="TagManager__container flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="TagManager__backdrop fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="TagManager__content inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="TagManager__close-button bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">{t('close')}</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="w-full">
              <h3 className="TagManager__title text-lg leading-6 font-medium text-gray-900 mb-6">
                {t('tagManager')}
              </h3>

              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="TagManager__create-button mb-6 inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  {t('createNewTag')}
                </button>
              )}

              {isCreating && (
                <TagForm
                  editingTag={editingTag}
                  isSubmitting={isSubmitting}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                />
              )}

              <TagList
                tags={tags}
                isLoading={isLoading}
                isDeletingTagId={deletingTagId}
                onEditTag={handleEditTag}
                onDeleteTag={handleDeleteTag}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}