import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config, getApiBaseUrl } from '@/lib/config';
import { clearAuthCookie } from '@/utils/authUtils';
import { getRequestOptions } from '@/services';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(config.auth.cookieName);

    if (authCookie) {
      const token = authCookie.value;

      if (token) {
        try {
          await fetch(`${getApiBaseUrl()}/auth/logout`, {
            ...getRequestOptions(),
            method: 'POST',
          });
        } catch (error) {
          console.error('Backend logout error:', error);
        }
      }
    }

    const response = NextResponse.json({ message: 'Logout successful' });
    clearAuthCookie(response);

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    clearAuthCookie(response);

    return response;
  }
}
