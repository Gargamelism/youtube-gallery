import { Channel, UserChannel, ChannelResponse, UserChannelResponse, QuotaExceededError as QuotaExceededErrorType, HttpStatusCode } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getRequestOptions } from './shared';

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

export async function fetchUserChannels(): Promise<ApiResponse<UserChannelResponse>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels`, getRequestOptions());
  return ResponseHandler.handle<UserChannelResponse>(response);
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