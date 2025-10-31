import { VideoResponse, VideoStats, UserVideo, TagMode, PaginationParams, VideoFilters } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getRequestOptions } from './shared';

export interface WatchStatusResponse {
  status: string;
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;
}

export interface NotInterestedResponse {
  status: string;
  is_not_interested: boolean;
  not_interested_at: string | null;
}

export function buildVideoQueryParams(params: VideoFilters & PaginationParams): string {
  const queryParams = new URLSearchParams();

  if (params.filter && params.filter !== 'all') {
    queryParams.set('watch_status', params.filter);
  }

  if (params.notInterestedFilter) {
    queryParams.set('not_interested_filter', params.notInterestedFilter);
  }

  if (params.selectedTags && params.selectedTags.length > 0) {
    queryParams.set('tags', params.selectedTags.join(','));
    queryParams.set('tag_mode', params.tagMode || TagMode.ANY);
  }

  if (params.searchQuery) {
    queryParams.set('search', params.searchQuery);
  }

  if (typeof params.page === 'number' && params.page > 0) {
    queryParams.set('page', params.page.toString());
  }

  if (typeof params.page_size === 'number' && params.page_size > 0) {
    queryParams.set('page_size', params.page_size.toString());
  }

  return queryParams.toString();
}

export async function fetchVideos(params: VideoFilters & PaginationParams): Promise<ApiResponse<VideoResponse>> {
  const queryString = buildVideoQueryParams(params);
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

export async function updateVideoNotInterested(
  videoId: string,
  isNotInterested: boolean
): Promise<ApiResponse<NotInterestedResponse>> {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/not-interested`, {
    ...getRequestOptions(),
    method: 'PUT',
    body: JSON.stringify({ is_not_interested: isNotInterested }),
  });
  return ResponseHandler.handle<NotInterestedResponse>(response);
}

export async function fetchUserVideos(): Promise<ApiResponse<UserVideo[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/videos`, getRequestOptions());
  return ResponseHandler.handle<UserVideo[]>(response);
}
