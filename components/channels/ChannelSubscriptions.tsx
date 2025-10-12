'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Tags } from 'lucide-react';
import { fetchUserChannels, fetchAvailableChannels, fetchUserQuotaUsage } from '@/services';
import { UserChannel, ChannelType } from '@/types';
import AvailableChannels from './AvailableChannels';
import { ImportChannelModal } from './ImportChannelModal';
import { useChannelUnsubscribe, useChannelSubscribe } from './mutations';
import { TagManager } from '@/components/tags/TagManager';
import { QuotaIndicatorCompact } from '@/components/quota';
import { USER_QUOTA_CONFIG, queryKeys, CHANNEL_QUERY_CONFIG } from '@/lib/reactQueryConfig';
import { ChannelFilterBar } from './ChannelFilterBar';
import { ChannelPagination } from './ChannelPagination';
import { useChannelFilters } from '@/hooks/useChannelFilters';
import SubscribedChannels from './SubscribedChannels';
import { SkeletonGrid, SubscribedChannelCardSkeleton, AvailableChannelCardSkeleton } from '@/components/ui';

const INVALID_PAGE_ERROR = 'Invalid page.';

const SUBSCRIBED_CHANNELS_PER_PAGE = 6;
const AVAILABLE_CHANNELS_PER_PAGE = 21;

export default function ChannelSubscriptions() {
  const { t } = useTranslation('channels');
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const queryClient = useQueryClient();
  const unsubscribeMutation = useChannelUnsubscribe(queryClient);
  const subscribeMutation = useChannelSubscribe(queryClient);

  const subscribedChannelsFilters = useChannelFilters(ChannelType.SUBSCRIBED);
  const availableChannelsFilters = useChannelFilters(ChannelType.AVAILABLE);

  const { data: subscribedChannelsResponse, isLoading: isLoadingUserChannels } = useQuery({
    queryKey: queryKeys.userChannelsWithFilter(subscribedChannelsFilters),
    queryFn: async () => {
      const response = await fetchUserChannels({
        pageSize: SUBSCRIBED_CHANNELS_PER_PAGE,
        ...subscribedChannelsFilters,
      });
      return response;
    },
    ...CHANNEL_QUERY_CONFIG,
  });

  const { data: availableChannelsResponse, isLoading: isLoadingAvailableChannels } = useQuery({
    queryKey: queryKeys.availableChannelsWithFilter(availableChannelsFilters),
    queryFn: () => fetchAvailableChannels(availableChannelsFilters),
    ...CHANNEL_QUERY_CONFIG,
  });

  const userChannelsData = subscribedChannelsResponse?.data;
  const availableChannelsData = availableChannelsResponse?.data;

  const { data: userQuotaInfo } = useQuery({
    queryKey: queryKeys.userQuota,
    queryFn: fetchUserQuotaUsage,
    select: response => response.data,
    ...USER_QUOTA_CONFIG,
  });

  const handleChannelUnsubscribe = async (channelId: string) => {
    return await unsubscribeMutation.mutateAsync(channelId);
  };

  const handleChannelSubscribe = async (channelId: string) => {
    return await subscribeMutation.mutateAsync(channelId);
  };

  const onTagsChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.userChannels });
  };

  const userChannels = userChannelsData?.results || [];
  const availableChannels = availableChannelsData?.results || [];

  const subscribedTotalPages = userChannelsData?.count
    ? Math.ceil(userChannelsData.count / SUBSCRIBED_CHANNELS_PER_PAGE)
    : 0;
  const availableTotalPages = availableChannelsData?.count
    ? Math.ceil(availableChannelsData.count / AVAILABLE_CHANNELS_PER_PAGE)
    : 0;

  const subscribedChannelIds = new Set(userChannels.map((userChannel: UserChannel) => userChannel.channel));

  // Auto-navigate to valid page if current page exceeds total pages
  useEffect(() => {
    if (
      !isLoadingUserChannels &&
      subscribedChannelsFilters.page > 0 &&
      subscribedChannelsResponse?.error === INVALID_PAGE_ERROR
    ) {
      subscribedChannelsFilters.updatePage(subscribedChannelsFilters.page - 1);
    }
    if (
      !isLoadingAvailableChannels &&
      availableChannelsFilters.page > 0 &&
      availableChannelsResponse?.error === INVALID_PAGE_ERROR
    ) {
      availableChannelsFilters.updatePage(availableChannelsFilters.page - 1);
    }
  }, [
    isLoadingUserChannels,
    subscribedTotalPages,
    subscribedChannelsFilters,
    isLoadingAvailableChannels,
    availableTotalPages,
    availableChannelsFilters,
  ]);

  return (
    <div className="ChannelSubscriptions max-w-6xl mx-auto p-6">
      <div className="ChannelSubscriptions__header flex justify-between items-center mb-8">
        <div className="ChannelSubscriptions__title-section">
          <h1 className="ChannelSubscriptions__title text-3xl font-bold text-gray-900">{t('channelSubscriptions')}</h1>
          <p className="ChannelSubscriptions__subtitle text-gray-600 mt-2">{t('manageSubscriptions')}</p>
        </div>
        <div className="ChannelSubscriptions__actions flex flex-col items-end gap-3">
          <div className="ChannelSubscriptions__buttons flex gap-3 items-center">
            <button
              onClick={() => setIsTagManagerOpen(true)}
              className="ChannelSubscriptions__tags-button flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <Tags className="ChannelSubscriptions__tags-icon h-5 w-5 mr-2" />
              {t('manageTags')}
            </button>
            <button
              onClick={() => setIsAddChannelModalOpen(true)}
              className="ChannelSubscriptions__add-button flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="ChannelSubscriptions__add-icon h-5 w-5 mr-2" />
              {t('addChannel')}
            </button>
            {userQuotaInfo && (
              <QuotaIndicatorCompact quotaInfo={userQuotaInfo} className="ChannelSubscriptions__quota-indicator" />
            )}
          </div>
        </div>
      </div>

      <div className="ChannelSubscriptions__subscribed-section mb-12">
        <h2 className="ChannelSubscriptions__subscribed-title text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Users className="ChannelSubscriptions__subscribed-icon h-5 w-5 mr-2" />
          {t('yourSubscriptions')} ({userChannelsData?.count || 0})
        </h2>

        <ChannelFilterBar
          search={subscribedChannelsFilters.search}
          selectedTags={subscribedChannelsFilters.selectedTags}
          tagMode={subscribedChannelsFilters.tagMode}
          onSearchChange={subscribedChannelsFilters.updateSearch}
          onTagsChange={subscribedChannelsFilters.updateTags}
          onTagModeChange={subscribedChannelsFilters.updateTagMode}
          showTagFilter={true}
        />

        {isLoadingUserChannels ? (
          <div
            className="ChannelSubscriptions__loading grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            role="status"
            aria-live="polite"
            aria-label="Loading subscribed channels"
          >
            <SkeletonGrid count={SUBSCRIBED_CHANNELS_PER_PAGE} cardSkeleton={<SubscribedChannelCardSkeleton />} />
          </div>
        ) : userChannels.length === 0 ? (
          <div className="ChannelSubscriptions__empty bg-gray-50 rounded-lg p-8 text-center" role="status">
            <Users className="ChannelSubscriptions__empty-icon h-12 w-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <h3 className="ChannelSubscriptions__empty-title text-lg font-medium text-gray-900 mb-2">
              {subscribedChannelsFilters.search || subscribedChannelsFilters.selectedTags.length > 0
                ? t('search.noResults')
                : t('noSubscriptionsYet')}
            </h3>
            <p className="ChannelSubscriptions__empty-description text-gray-600">
              {subscribedChannelsFilters.search || subscribedChannelsFilters.selectedTags.length > 0
                ? t('search.tryDifferentFilters')
                : t('noSubscriptionsDescription')}
            </p>
          </div>
        ) : (
          <>
            <SubscribedChannels
              userChannels={userChannels}
              canUnsubscribe={unsubscribeMutation.isPending}
              handleChannelUnsubscribe={handleChannelUnsubscribe}
              onTagsChange={onTagsChange}
            />

            <ChannelPagination
              currentPage={subscribedChannelsFilters.page}
              totalPages={subscribedTotalPages}
              totalCount={userChannelsData?.count || 0}
              onPageChange={subscribedChannelsFilters.updatePage}
              paginationName="subscribed"
              pageSize={SUBSCRIBED_CHANNELS_PER_PAGE}
            />
          </>
        )}
      </div>

      <div className="ChannelSubscriptions__available-section">
        <h2 className="ChannelSubscriptions__available-title text-xl font-semibold text-gray-900 mb-6">
          {t('availableChannels')} ({availableChannelsData?.count || 0})
        </h2>

        <ChannelFilterBar
          search={availableChannelsFilters.search}
          selectedTags={availableChannelsFilters.selectedTags}
          tagMode={availableChannelsFilters.tagMode}
          onSearchChange={availableChannelsFilters.updateSearch}
          onTagsChange={availableChannelsFilters.updateTags}
          onTagModeChange={availableChannelsFilters.updateTagMode}
          showTagFilter={false}
        />

        {isLoadingAvailableChannels ? (
          <div
            className="ChannelSubscriptions__loading grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            role="status"
            aria-live="polite"
            aria-label="Loading available channels"
          >
            <SkeletonGrid count={AVAILABLE_CHANNELS_PER_PAGE} cardSkeleton={<AvailableChannelCardSkeleton />} />
          </div>
        ) : availableChannels.length === 0 ? (
          <div className="ChannelSubscriptions__empty bg-gray-50 rounded-lg p-8 text-center" role="status">
            <Users className="ChannelSubscriptions__empty-icon h-12 w-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <h3 className="ChannelSubscriptions__empty-title text-lg font-medium text-gray-900 mb-2">
              {t('search.noResults')}
            </h3>
            <p className="ChannelSubscriptions__empty-description text-gray-600">{t('search.tryDifferentFilters')}</p>
          </div>
        ) : (
          <>
            <AvailableChannels
              subscribedChannelIds={subscribedChannelIds}
              filteredChannels={availableChannels}
              handleSubscribe={(channelId: string) => handleChannelSubscribe(channelId)}
              canSubscribe={subscribeMutation.isPending}
            />

            <ChannelPagination
              currentPage={availableChannelsFilters.page}
              totalPages={availableTotalPages}
              totalCount={availableChannelsData?.count || 0}
              onPageChange={availableChannelsFilters.updatePage}
              paginationName="available"
              pageSize={AVAILABLE_CHANNELS_PER_PAGE}
            />
          </>
        )}
      </div>

      <ImportChannelModal isOpen={isAddChannelModalOpen} onClose={() => setIsAddChannelModalOpen(false)} />

      <TagManager isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} onTagsChange={onTagsChange} />
    </div>
  );
}
