import { ChannelTag, ChannelTagResponse, TagCreateRequest } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getBasicHeaders, getRequestOptions } from './shared';

export async function fetchChannelTags(): Promise<ApiResponse<ChannelTagResponse>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags`, getRequestOptions());
  return ResponseHandler.handle<ChannelTagResponse>(response);
}

export async function createChannelTag(tag: TagCreateRequest): Promise<ApiResponse<ChannelTag>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags`, {
    ...getRequestOptions(),
    method: 'POST',
    headers: getBasicHeaders(),
    body: JSON.stringify(tag),
  });
  return ResponseHandler.handle<ChannelTag>(response);
}

export async function updateChannelTag(id: string, tag: Partial<TagCreateRequest>): Promise<ApiResponse<ChannelTag>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags/${id}`, {
    ...getRequestOptions(),
    method: 'PUT',
    headers: getBasicHeaders(),
    body: JSON.stringify(tag),
  });
  return ResponseHandler.handle<ChannelTag>(response);
}

export async function deleteChannelTag(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/tags/${id}`, {
    ...getRequestOptions(),
    method: 'DELETE',
  });
  return ResponseHandler.handle<void>(response);
}

export async function fetchChannelTagsById(channelId: string): Promise<ApiResponse<ChannelTag[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${channelId}/tags`, getRequestOptions());
  return ResponseHandler.handle<ChannelTag[]>(response);
}

export async function assignChannelTags(channelId: string, tagIds: string[]): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE_URL}/auth/channels/${channelId}/tags`, {
    ...getRequestOptions(),
    method: 'PUT',
    body: JSON.stringify({ tag_ids: tagIds }),
  });
  return ResponseHandler.handle<void>(response);
}