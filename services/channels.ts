import { Channel, UserChannel, ChannelResponse, UserChannelResponse, QuotaExceededErrorType, HttpStatusCode, ChannelFilters } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getRequestOptions } from './shared';
import { filtersToApiParams } from '@/utils/channelUrlHelpers';

export class QuotaExceededError extends Error {
  public readonly quotaInfo: QuotaExceededErrorType;

  constructor(quotaInfo: QuotaExceededErrorType) {
    super(quotaInfo.message);
    this.name = 'QuotaExceededError';
    this.quotaInfo = quotaInfo;
  }
}

export async function fetchChannels(): Promise<ApiResponse<ChannelResponse>> {
  const response = await fetch(`${API_BASE_URL}/channels`, getRequestOptions());
  return ResponseHandler.handle<ChannelResponse>(response);
}

export async function fetchChannelById(channelId: string): Promise<ApiResponse<Channel>> {
  const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, getRequestOptions());
  return ResponseHandler.handle<Channel>(response);
}

export async function importChannelFromYoutube(channelId: string): Promise<ApiResponse<Channel>> {
  const response = await fetch(`${API_BASE_URL}/channels/fetch-from-youtube`, {
    ...getRequestOptions(),
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId }),
  });

  if (response.status === HttpStatusCode.TOO_MANY_REQUESTS) {
    const errorData = await response.json();
    if (errorData.quota_info) {
      throw new QuotaExceededError(errorData);
    }
  }

  return ResponseHandler.handle<Channel>(response);
}

export async function fetchUserChannels(filters?: Partial<ChannelFilters>): Promise<ApiResponse<UserChannelResponse>> {
  let url = `${API_BASE_URL}/auth/channels`;

  if (filters) {
    const apiParams = filtersToApiParams(filters);
    const params = new URLSearchParams();

    if (apiParams.page) params.append('page', apiParams.page.toString());
    if (apiParams.search) params.append('search', apiParams.search);
    if (apiParams.tags?.length) params.append('tags', apiParams.tags.join(','));
    if (apiParams.tag_mode) params.append('tag_mode', apiParams.tag_mode);

    const queryString = params.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }

  const response = await fetch(url, getRequestOptions());
  return ResponseHandler.handle<UserChannelResponse>(response);
}

export async function fetchAvailableChannels(filters?: Partial<ChannelFilters>): Promise<ApiResponse<ChannelResponse>> {
  let url = `${API_BASE_URL}/auth/channels/available`;

  if (filters) {
    const apiParams = filtersToApiParams(filters);
    const params = new URLSearchParams();

    if (apiParams.page) params.append('page', apiParams.page.toString());
    if (apiParams.search) params.append('search', apiParams.search);
    if (apiParams.tags?.length) params.append('tags', apiParams.tags.join(','));
    if (apiParams.tag_mode) params.append('tag_mode', apiParams.tag_mode);

    const queryString = params.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }

  const response = await fetch(url, getRequestOptions());
  return ResponseHandler.handle<ChannelResponse>(response);
}

export async function subscribeToChannel(channelId: string): Promise<ApiResponse<UserChannel>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels`, {
    ...getRequestOptions(),
    method: 'POST',
    body: JSON.stringify({ channel: channelId }),
  });
  return ResponseHandler.handle<UserChannel>(response);
}

export async function unsubscribeFromChannel(subscriptionId: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${subscriptionId}`, {
    ...getRequestOptions(),
    method: 'DELETE',
  });
  return ResponseHandler.handle<void>(response);
}