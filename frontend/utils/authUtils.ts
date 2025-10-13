import { config } from '@/lib/config';
import type { NextResponse } from 'next/server';

export function extractTokenFromResponse(response: Response): string | null {
  const cookieHeader = response.headers.get('set-cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(',').map(cookie => cookie.trim());
  const authCookie = cookies.find(cookie =>
    cookie.startsWith(`${config.auth.cookieName}=`)
  );

  if (!authCookie) {
    return null;
  }

  const tokenMatch = authCookie.match(`${config.auth.cookieName}=([^;]+)`);
  return tokenMatch?.[1] || null;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(config.auth.cookieName, token, {
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(config.auth.cookieName, '', {
    httpOnly: true,
    secure: config.app.isProduction,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}