import { ChannelTag, TagCreateRequest } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getAuthHeaders } from './shared';

export async function fetchChannelTags(): Promise<ApiResponse<ChannelTag[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<ChannelTag[]>(response);
}

export async function createChannelTag(tag: TagCreateRequest): Promise<ApiResponse<ChannelTag>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(tag),
  });
  return ResponseHandler.handle<ChannelTag>(response);
}

export async function updateChannelTag(id: string, tag: Partial<TagCreateRequest>): Promise<ApiResponse<ChannelTag>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(tag),
  });
  return ResponseHandler.handle<ChannelTag>(response);
}

export async function deleteChannelTag(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<void>(response);
}

export async function fetchChannelTagsById(channelId: string): Promise<ApiResponse<ChannelTag[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${channelId}/tags`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<ChannelTag[]>(response);
}

export async function assignChannelTags(channelId: string, tagIds: string[]): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${channelId}/tags`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tag_ids: tagIds }),
  });
  return ResponseHandler.handle<void>(response);
}