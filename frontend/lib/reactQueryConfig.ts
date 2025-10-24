/**
 * React Query configuration constants
 */

import { VideoFilters, ChannelFilters } from '@/types';

// Time constants in milliseconds
const THIRTY_SECONDS = 30 * 1000;
const NINETY_SECONDS = 90 * 1000;
const ONE_MINUTE = 1 * 60 * 1000;
const TWO_MINUTES = 2 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

const STABLE_DATA_CONFIG = {
  staleTime: FIVE_MINUTES,
  gcTime: TEN_MINUTES,
  refetchOnWindowFocus: false,
  retry: 2,
} as const;

const DYNAMIC_DATA_CONFIG = {
  staleTime: TWO_MINUTES,
  gcTime: FIVE_MINUTES,
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const TAG_QUERY_CONFIG = {
  ...STABLE_DATA_CONFIG,
  staleTime: FIVE_MINUTES,
} as const;

export const VIDEO_QUERY_CONFIG = {
  ...DYNAMIC_DATA_CONFIG,
  staleTime: NINETY_SECONDS,
  retry: 1,
} as const;

export const CHANNEL_QUERY_CONFIG = {
  staleTime: FIVE_MINUTES,
  gcTime: TEN_MINUTES,
  refetchOnWindowFocus: false,
  retry: 2,
} as const;

export const USER_DATA_CONFIG = {
  ...STABLE_DATA_CONFIG,
  staleTime: FIFTEEN_MINUTES,
  gcTime: THIRTY_MINUTES,
} as const;

export const REALTIME_DATA_CONFIG = {
  staleTime: 0,
  gcTime: ONE_MINUTE,
  refetchOnWindowFocus: true,
  retry: 0,
} as const;

export const USER_QUOTA_CONFIG = {
  ...USER_DATA_CONFIG,
  staleTime: THIRTY_SECONDS,
  refetchInterval: THIRTY_SECONDS,
  refetchOnWindowFocus: true,
} as const;

export const DEFAULT_QUERY_CONFIG = {
  queries: {
    staleTime: TWO_MINUTES,
    gcTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
    retry: 1,
  },
  mutations: {
    retry: 1,
  },
} as const;

export const queryKeys = {
  channelTags: ['channelTags'] as const,
  channelTagsById: (channelId: string) => ['channelTags', channelId] as const,

  videos: ['videos'] as const,
  videosWithFilter: (params: VideoFilters) => ['videos', 'filtered', params] as const,
  videoStats: ['videos', 'stats'] as const,

  channels: ['channels'] as const,
  userChannels: ['userChannels'] as const,
  userChannelsWithFilter: (filters: Partial<ChannelFilters>) => ['userChannels', 'filtered', filters] as const,
  availableChannels: ['availableChannels'] as const,
  availableChannelsWithFilter: (filters: Partial<ChannelFilters>) =>
    ['availableChannels', 'filtered', filters] as const,
  channelById: (channelId: string) => ['channels', channelId] as const,

  userProfile: ['user', 'profile'] as const,
  userAuth: ['user', 'auth'] as const,
  userQuota: ['userQuota'] as const,
} as const;
