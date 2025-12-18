import { getApiBaseUrl } from '@/lib/config';

export const API_BASE_URL = getApiBaseUrl();

export function getBasicHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

export function getRequestOptions(): RequestInit {
  return {
    headers: getBasicHeaders(),
    credentials: 'include',
  };
}
