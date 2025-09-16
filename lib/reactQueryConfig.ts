/**
 * React Query configuration constants
 */

const STABLE_DATA_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  retry: 2,
} as const;

const DYNAMIC_DATA_CONFIG = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
  retry: 1,
} as const;

export const TAG_QUERY_CONFIG = {
  ...STABLE_DATA_CONFIG,
  staleTime: 5 * 60 * 1000,
} as const;

export const VIDEO_QUERY_CONFIG = {
  ...DYNAMIC_DATA_CONFIG,
  staleTime: 90 * 1000, // 90 seconds
  retry: 1,
} as const;

export const CHANNEL_QUERY_CONFIG = {
  ...STABLE_DATA_CONFIG,
  staleTime: 10 * 60 * 1000, // 10 minutes
} as const;

export const USER_DATA_CONFIG = {
  ...STABLE_DATA_CONFIG,
  staleTime: 15 * 60 * 1000, // 15 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
} as const;

export const REALTIME_DATA_CONFIG = {
  staleTime: 0,
  gcTime: 1 * 60 * 1000, // 1 minute
  refetchOnWindowFocus: true,
  retry: 0,
} as const;

export const DEFAULT_QUERY_CONFIG = {
  queries: {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
  videosWithFilter: (params: { watch_status?: string; tags?: string[]; tag_mode?: string }) => ['videos', 'filtered', params] as const,
  videoStats: ['videos', 'stats'] as const,

  channels: ['channels'] as const,
  userChannels: ['userChannels'] as const,
  channelById: (channelId: string) => ['channels', channelId] as const,

  userProfile: ['user', 'profile'] as const,
  userAuth: ['user', 'auth'] as const,
} as const;