import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicRoute } from './config/routes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('youtube-gallery-auth')?.value;

  if (!token) {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
