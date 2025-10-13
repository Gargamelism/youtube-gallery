import { User, LoginRequest, RegisterRequest, UserQuotaInfo } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getRequestOptions } from './shared';

export async function login(credentials: LoginRequest): Promise<ApiResponse<{ user: User; message: string }>> {
  const response = await fetch('/api/auth/login', {
    ...getRequestOptions(),
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return ResponseHandler.handle<{ user: User; message: string }>(response);
}

export async function register(userData: RegisterRequest): Promise<ApiResponse<{ user: User; message: string }>> {
  const response = await fetch('/api/auth/register', {
    ...getRequestOptions(),
    method: 'POST',
    body: JSON.stringify(userData),
  });
  return ResponseHandler.handle<{ user: User; message: string }>(response);
}

export async function logout(): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch('/api/auth/logout', {
    ...getRequestOptions(),
    method: 'POST',
  });
  return ResponseHandler.handle<{ message: string }>(response);
}

export async function fetchUserProfile(): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, getRequestOptions());
  return ResponseHandler.handle<User>(response);
}

export async function getYouTubeAuthUrl(
  redirectUri: string,
  returnUrl: string
): Promise<ApiResponse<{ auth_url: string }>> {
  const response = await fetch(
    `${API_BASE_URL}/auth/youtube-url?redirect_uri=${encodeURIComponent(redirectUri)}&return_url=${encodeURIComponent(returnUrl)}`,
    getRequestOptions()
  );
  return ResponseHandler.handle<{ auth_url: string }>(response);
}

export async function fetchUserQuotaUsage(): Promise<ApiResponse<UserQuotaInfo>> {
  const response = await fetch(`${API_BASE_URL}/auth/quota-usage`, getRequestOptions());
  return ResponseHandler.handle<UserQuotaInfo>(response);
}