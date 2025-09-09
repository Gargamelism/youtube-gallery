import { useAuthStore } from '@/stores/authStore';

export const API_BASE_URL = process.env.BE_PUBLIC_API_URL || 'http://localhost:8000/api';

export function getAuthHeaders(): Record<string, string> {
  return useAuthStore.getState().getAuthHeaders();
}