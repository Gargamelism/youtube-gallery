import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { extractTokenFromResponse, setAuthCookie } from '@/utils/authUtils';
import { getRequestOptions } from '@/services';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${config.api.baseUrl}/auth/register`, {
      ...getRequestOptions(),
      method: 'POST',
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
      message: 'Registration successful',
    };

    const nextResponse = NextResponse.json(responseData);
    setAuthCookie(nextResponse, token);

    return nextResponse;
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
