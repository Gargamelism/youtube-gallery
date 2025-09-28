import { VideoResponse, VideoStats, UserVideo, TagFilterParams, TagMode, PaginationParams } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getRequestOptions } from './shared';

export interface WatchStatusResponse {
  status: string;
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;
}

function buildVideoQueryParams(params: TagFilterParams & PaginationParams): string {
  const queryParams = new URLSearchParams();

  if (params.watch_status && params.watch_status !== 'all') {
    queryParams.set('watch_status', params.watch_status);
  }

  if (params.tags && params.tags.length > 0) {
    queryParams.set('tags', params.tags.join(','));
    queryParams.set('tag_mode', params.tag_mode || TagMode.ANY);
  }

  if (params.page) {
    queryParams.set('page', params.page.toString());
  }

  if (params.page_size) {
    queryParams.set('page_size', params.page_size.toString());
  }

  return queryParams.toString();
}

export async function fetchVideos(params?: TagFilterParams & PaginationParams): Promise<ApiResponse<VideoResponse>> {
  const queryString = buildVideoQueryParams(params || {});
  let url = `${API_BASE_URL}/videos`;
  if (queryString) {
    url += `?${queryString}`;
  }

  const response = await fetch(url, getRequestOptions());
  return ResponseHandler.handle<VideoResponse>(response);
}

export async function fetchVideoStats(): Promise<ApiResponse<VideoStats>> {
  const response = await fetch(`${API_BASE_URL}/videos/stats`, getRequestOptions());
  return ResponseHandler.handle<VideoStats>(response);
}

export async function updateVideoWatchStatus(
  videoId: string,
  is_watched: boolean,
  notes?: string
): Promise<ApiResponse<WatchStatusResponse>> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/watch`, {
    ...getRequestOptions(),
    method: 'PUT',
    body: JSON.stringify({ is_watched, notes: notes || '' }),
  });
  return ResponseHandler.handle<WatchStatusResponse>(response);
}

export async function fetchUserVideos(): Promise<ApiResponse<UserVideo[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/videos`, getRequestOptions());
  return ResponseHandler.handle<UserVideo[]>(response);
}
