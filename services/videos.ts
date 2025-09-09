import { VideoResponse, VideoStats, UserVideo, TagFilterParams, TagMode } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getAuthHeaders } from './shared';

export interface WatchStatusResponse {
  status: string;
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;
}

export async function fetchVideos(filter?: string): Promise<ApiResponse<VideoResponse>> {
  let url = `${API_BASE_URL}/videos`;
  if (filter && filter !== 'all') {
    url = `${API_BASE_URL}/videos/${filter}`;
  }
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<VideoResponse>(response);
}

export async function fetchVideoStats(): Promise<ApiResponse<VideoStats>> {
  const response = await fetch(`${API_BASE_URL}/videos/stats`, {
    headers: getAuthHeaders(),
  });

  return ResponseHandler.handle<VideoStats>(response);
}

export async function updateVideoWatchStatus(
  videoId: string,
  is_watched: boolean,
  notes?: string
): Promise<ApiResponse<WatchStatusResponse>> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/watch`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ is_watched, notes: notes || '' }),
  });
  return ResponseHandler.handle<WatchStatusResponse>(response);
}

export async function fetchUserVideos(): Promise<ApiResponse<UserVideo[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/videos`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<UserVideo[]>(response);
}

export async function fetchVideosWithTags(params: TagFilterParams): Promise<ApiResponse<VideoResponse>> {
  const queryParams = new URLSearchParams();

  if (params.watch_status && params.watch_status !== 'all') {
    queryParams.set('watch_status', params.watch_status);
  }

  if (params.tags && params.tags.length > 0) {
    queryParams.set('tags', params.tags.join(','));
    queryParams.set('tag_mode', params.tag_mode || TagMode.ANY);
  }

  let url = `${API_BASE_URL}/videos`;
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<VideoResponse>(response);
}