import { ReadonlyURLSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

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