'use client';

import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NotInterestedFilter } from '@/types';

interface NotInterestedButtonProps {
  isNotInterested: boolean;
  notInterestedFilter: NotInterestedFilter;
  onClick: () => void;
}

export function NotInterestedButton({ isNotInterested, notInterestedFilter, onClick }: NotInterestedButtonProps) {
  const { t } = useTranslation('videos');

  const showingNotInterestedVideos =
    notInterestedFilter === NotInterestedFilter.ONLY ||
    (notInterestedFilter === NotInterestedFilter.INCLUDE && isNotInterested);

  const Icon = showingNotInterestedVideos ? Plus : X;
  const label = showingNotInterestedVideos ? t('markInterested') : t('markNotInterested');

  const baseClasses = 'absolute top-2 right-2 z-10 p-2 rounded-full transition-all duration-200';
  const focusClasses = 'focus:opacity-100 focus:outline-none focus:ring-2';

  let colorClasses = '';
  let visibilityClasses = '';
  let ringColor = '';

  if (isNotInterested) {
    visibilityClasses = 'opacity-100';
    if (showingNotInterestedVideos) {
      colorClasses = 'bg-green-100 text-green-700 hover:bg-green-200';
      ringColor = 'focus:ring-green-500';
    } else {
      colorClasses = 'bg-red-100 text-red-700 hover:bg-red-200';
      ringColor = 'focus:ring-red-500';
    }
  } else {
    visibilityClasses = 'bg-white/90 opacity-0 group-hover:opacity-100';
    colorClasses = 'text-gray-600 hover:bg-red-100 hover:text-red-700';
    ringColor = 'focus:ring-red-500';
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${visibilityClasses} ${colorClasses} ${focusClasses} ${ringColor}`}
      aria-label={label}
      title={label}
      type="button"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
