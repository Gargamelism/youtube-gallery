'use client';

export function VideoCardSkeleton() {
  return (
    <div className="VideoCardSkeleton relative overflow-hidden rounded-lg border bg-white shadow p-4 animate-pulse">
      <div className="VideoCardSkeleton__content flex flex-col gap-4">
        <div className="VideoCardSkeleton__thumbnail w-full h-48 bg-gray-200 rounded-md relative">
          <div className="VideoCardSkeleton__duration absolute bottom-2 right-2 w-12 h-5 bg-gray-300 rounded"></div>
        </div>

        <div className="VideoCardSkeleton__info flex-1 min-w-0">
          <div className="VideoCardSkeleton__title-line1 h-6 bg-gray-200 rounded w-full mb-2"></div>
          <div className="VideoCardSkeleton__title-line2 h-6 bg-gray-200 rounded w-3/4 mb-4"></div>

          <div className="VideoCardSkeleton__channel h-5 bg-gray-200 rounded w-1/2 mb-3"></div>

          <div className="VideoCardSkeleton__tags flex flex-wrap gap-1 mb-3">
            <div className="VideoCardSkeleton__tag h-6 w-16 bg-gray-200 rounded-full"></div>
            <div className="VideoCardSkeleton__tag h-6 w-20 bg-gray-200 rounded-full"></div>
            <div className="VideoCardSkeleton__tag h-6 w-14 bg-gray-200 rounded-full"></div>
          </div>

          <div className="VideoCardSkeleton__stats flex items-center gap-4 mb-4">
            <div className="VideoCardSkeleton__stat h-4 w-20 bg-gray-200 rounded"></div>
            <div className="VideoCardSkeleton__stat h-4 w-16 bg-gray-200 rounded"></div>
            <div className="VideoCardSkeleton__stat h-4 w-12 bg-gray-200 rounded"></div>
          </div>

          <div className="VideoCardSkeleton__actions flex items-center gap-3">
            <div className="VideoCardSkeleton__action-button h-9 w-32 bg-gray-200 rounded-lg"></div>
            <div className="VideoCardSkeleton__action-button h-9 w-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
