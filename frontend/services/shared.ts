// For server-side API routes, use the Docker service name
// For client-side requests, use the public URL
export const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.BE_INTERNAL_API_URL || 'http://backend:8000/api' // Server-side
    : process.env.BE_PUBLIC_API_URL || 'http://localhost:8000/api'; // Client-side

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
