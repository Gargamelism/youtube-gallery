import { Channel, UserChannel, UserChannelResponse } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getAuthHeaders } from './shared';

export async function fetchChannels(): Promise<ApiResponse<{ results: Channel[] }>> {
  const response = await fetch(`${API_BASE_URL}/channels`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<{ results: Channel[] }>(response);
}

export async function fetchChannelById(channelId: string): Promise<ApiResponse<Channel>> {
  const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<Channel>(response);
}

export async function importChannelFromYoutube(channelId: string): Promise<ApiResponse<Channel>> {
  const response = await fetch(`${API_BASE_URL}/channels/fetch-from-youtube`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ channel_id: channelId }),
    credentials: 'include',
  });
  return ResponseHandler.handle<Channel>(response);
}

export async function fetchUserChannels(): Promise<ApiResponse<UserChannelResponse>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<UserChannelResponse>(response);
}

export async function subscribeToChannel(channelId: string): Promise<ApiResponse<UserChannel>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ channel: channelId }),
  });
  return ResponseHandler.handle<UserChannel>(response);
}

export async function unsubscribeFromChannel(subscriptionId: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${subscriptionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<void>(response);
}