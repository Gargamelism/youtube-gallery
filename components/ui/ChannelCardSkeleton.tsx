'use client';

import { ReactNode } from 'react';

interface SkeletonGridProps {
  count: number;
  cardSkeleton: ReactNode;
}

export function SkeletonGrid({ count, cardSkeleton }: SkeletonGridProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} role="status" aria-label="Loading channel">
          {cardSkeleton}
        </div>
      ))}
    </>
  );
}

export function SubscribedChannelCardSkeleton() {
  return (
    <div className="SubscribedChannelCardSkeleton bg-white rounded-lg shadow-md p-6 border animate-pulse">
      <div className="SubscribedChannelCardSkeleton__header flex items-start justify-between mb-4">
        <div className="SubscribedChannelCardSkeleton__info flex-1">
          <div className="SubscribedChannelCardSkeleton__title h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="SubscribedChannelCardSkeleton__channel-id h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="SubscribedChannelCardSkeleton__unsubscribe-button h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>

      <div className="SubscribedChannelCardSkeleton__subscribed-date h-4 bg-gray-200 rounded w-1/3 mb-4"></div>

      <div className="SubscribedChannelCardSkeleton__tags h-10 bg-gray-200 rounded mb-4"></div>

      <div className="SubscribedChannelCardSkeleton__link h-4 bg-gray-200 rounded w-1/4"></div>
    </div>
  );
}

export function AvailableChannelCardSkeleton() {
  return (
    <div className="AvailableChannelCardSkeleton bg-white rounded-lg shadow-md p-6 border animate-pulse">
      <div className="AvailableChannelCardSkeleton__header flex items-start justify-between mb-4">
        <div className="AvailableChannelCardSkeleton__info flex-1">
          <div className="AvailableChannelCardSkeleton__title h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="AvailableChannelCardSkeleton__channel-id h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="AvailableChannelCardSkeleton__description-line1 h-4 bg-gray-200 rounded w-full mb-1"></div>
          <div className="AvailableChannelCardSkeleton__description-line2 h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>

      <div className="AvailableChannelCardSkeleton__stats h-4 bg-gray-200 rounded w-1/4 mb-4"></div>

      <div className="AvailableChannelCardSkeleton__actions flex items-center justify-between">
        <div className="AvailableChannelCardSkeleton__link h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="AvailableChannelCardSkeleton__subscribe-button h-9 w-24 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
}
