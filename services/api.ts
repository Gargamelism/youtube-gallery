import {
  VideoResponse,
  VideoStats,
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Channel,
  UserChannel,
  UserVideo,
  UserChannelResponse,
} from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { ResponseHandler, ApiResponse } from './ResponseHandler';

const API_BASE_URL = process.env.BE_PUBLIC_API_URL || 'http://localhost:8000/api';

function getAuthHeaders(): Record<string, string> {
  return useAuthStore.getState().getAuthHeaders();
}

export async function login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return ResponseHandler.handle<AuthResponse>(response);
}

export async function register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return ResponseHandler.handle<AuthResponse>(response);
}

export async function logout(): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<{ message: string }>(response);
}

export async function fetchUserProfile(): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<User>(response);
}

// Video API
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

export interface WatchStatusResponse {
  status: string;
  is_watched: boolean;
  watched_at: string | null;
  notes: string | null;
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

// Channel API
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

// User Channel Subscriptions API
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

// User Video Interactions API
export async function fetchUserVideos(): Promise<ApiResponse<UserVideo[]>> {
  const response = await fetch(`${API_BASE_URL}/auth/videos`, {
    headers: getAuthHeaders(),
  });
  return ResponseHandler.handle<UserVideo[]>(response);
}

export async function getYouTubeAuthUrl(
  redirectUri: string,
  returnUrl: string
): Promise<ApiResponse<{ auth_url: string }>> {
  const response = await fetch(
    `${API_BASE_URL}/auth/youtube-url?redirect_uri=${encodeURIComponent(redirectUri)}&return_url=${encodeURIComponent(returnUrl)}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    }
  );
  return ResponseHandler.handle<{ auth_url: string }>(response);
}
