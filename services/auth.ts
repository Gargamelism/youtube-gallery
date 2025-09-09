import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types';
import { ResponseHandler, ApiResponse } from './ResponseHandler';
import { API_BASE_URL, getAuthHeaders } from './shared';

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