/**
 * Single source of truth for public (unprotected) routes configuration
 * All other routes are considered protected by default
 */
export const PUBLIC_ROUTES = ['/', '/auth'] as const;

/**
 * Explicitly allowed routes for return URL sanitization
 * Only these routes can be used as return URLs after login
 */
export const ALLOWED_RETURN_URL_ROUTES = ['/videos', '/channels'] as const;

/**
 * Check if a given pathname is a public (unprotected) route
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a given pathname is a protected route (inverse of public)
 */
export function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

/**
 * Check if a given pathname is an allowed return URL route
 */
export function isAllowedReturnUrlRoute(pathname: string): boolean {
  return ALLOWED_RETURN_URL_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Generate Next.js middleware matcher patterns to run on all routes except public ones
 * Using negative patterns would be complex, so we'll check inside middleware instead
 */
export const MIDDLEWARE_MATCHER = ['/((?!_next/static|_next/image|favicon.ico).*)'];