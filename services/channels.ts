import { Channel, UserChannel, ChannelResponse, UserChannelResponse } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getRequestOptions } from './shared';

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