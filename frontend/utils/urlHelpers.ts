import { ReadonlyURLSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { isAllowedReturnUrlRoute } from '@/config/routes';

const MAX_RETURN_URL_LENGTH = 2000;

/**
 * Updates URL search parameters with new values
 * @param searchParams - Current URL search parameters
 * @param updates - Object with key-value pairs to update
 * @returns Updated query string
 */
export function updateUrlParams(
  searchParams: ReadonlyURLSearchParams,
  updates: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams(searchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      params.delete(key);
    } else if (Array.isArray(value)) {
      params.set(key, value.join(','));
    } else {
      params.set(key, value);
    }
  });

  return params.toString();
}

/**
 * Navigates to a new URL with updated parameters
 * @param router - Next.js router instance
 * @param pathname - Current pathname
 * @param searchParams - Current URL search parameters
 * @param updates - Object with key-value pairs to update
 */
export function navigateWithUpdatedParams(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  updates: Record<string, string | string[] | undefined>
): void {
  const queryString = updateUrlParams(searchParams, updates);
  router.push(pathname + (queryString ? '?' + queryString : ''));
}

/**
 * Sanitizes return URLs to prevent open redirect vulnerabilities
 * Only allows same-origin, relative paths without protocols
 */
export function sanitizeReturnUrl(returnUrl: string | null | undefined, fallback = '/'): string {
  if (!returnUrl || typeof returnUrl !== 'string') {
    return fallback;
  }

  const trimmed = returnUrl.trim();

  if (!trimmed || trimmed.length > MAX_RETURN_URL_LENGTH) {
    return fallback;
  }

  if (trimmed.startsWith('//') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return fallback;
  }

  if (trimmed.includes(':') && !/^\//.test(trimmed)) {
    return fallback;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (normalizedPath.includes('../') || normalizedPath.includes('/..')) {
    return fallback;
  }

  const pathWithoutQuery = normalizedPath.split('?')[0]!.split('#')[0]!;

  if (!isAllowedReturnUrlRoute(pathWithoutQuery)) {
    return fallback;
  }

  return normalizedPath;
}

/**
 * Gets return URL from query params and sanitizes it
 */
export function getReturnUrl(searchParams: URLSearchParams, fallback = '/videos'): string {
  const returnUrl = searchParams.get('returnUrl');
  return sanitizeReturnUrl(returnUrl, fallback);
}