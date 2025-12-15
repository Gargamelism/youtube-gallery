import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/config';
import { extractTokenFromResponse, setAuthCookie } from '@/utils/authUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const token = extractTokenFromResponse(response);
    if (!token) {
      return NextResponse.json({ error: 'Authentication token not received' }, { status: 500 });
    }

    const responseData = {
      user: data.user,
      message: 'Login successful',
    };

    const nextResponse = NextResponse.json(responseData);
    setAuthCookie(nextResponse, token);

    return nextResponse;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
