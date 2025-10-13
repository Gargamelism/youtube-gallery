// Mock Next.js server environment before importing
Object.defineProperty(globalThis, 'Request', {
  value: class MockRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  },
});

Object.defineProperty(globalThis, 'Response', {
  value: class MockResponse {
    status: number;
    headers: Map<string, string>;
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status || 200;
      this.headers = new Map();
      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value as string);
        });
      }
    }
    static redirect(url: string, status = 302) {
      const response = new MockResponse(null, { status });
      response.headers.set('location', url);
      return response;
    }
  },
});

import { NextRequest } from 'next/server';

// Mock NextRequest
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    nextUrl: { pathname: string; search: string };
    cookies: { get: (name: string) => { value: string } | undefined; set: (name: string, value: string) => void };
    private cookieMap: Map<string, { value: string }>;

    constructor(url: string) {
      this.url = url;
      const urlObj = new URL(url);
      this.nextUrl = {
        pathname: urlObj.pathname,
        search: urlObj.search
      };
      this.cookieMap = new Map();
      this.cookies = {
        get: (name: string) => this.cookieMap.get(name),
        set: (name: string, value: string) => this.cookieMap.set(name, { value })
      };
    }
  },
  NextResponse: {
    next: () => ({ status: 200 }),
    redirect: (url: string) => ({
      status: 307,
      headers: {
        get: (name: string) => name === 'location' ? String(url) : undefined
      }
    })
  }
}));

// Mock the config/routes module
jest.mock('../config/routes', () => ({
  isPublicRoute: jest.fn(),
  MIDDLEWARE_MATCHER: ['/((?!_next/static|_next/image|favicon.ico).*)']
}));

import { middleware } from '../middleware';
import { isPublicRoute } from '../config/routes';

const mockIsPublicRoute = isPublicRoute as jest.MockedFunction<typeof isPublicRoute>;

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (pathname: string, searchParams?: string) => {
    const url = `https://localhost:3000${pathname}${searchParams ? `?${searchParams}` : ''}`;
    return new NextRequest(url);
  };

  const createRequestWithCookies = (pathname: string, cookies: Record<string, string> = {}) => {
    const request = createRequest(pathname);
    Object.entries(cookies).forEach(([name, value]) => {
      request.cookies.set(name, value);
    });
    return request;
  };

  describe('public routes', () => {
    it('should allow access to public routes without authentication', () => {
      mockIsPublicRoute.mockReturnValue(true);
      const request = createRequest('/');

      const response = middleware(request);

      expect(mockIsPublicRoute).toHaveBeenCalledWith('/');
      expect(response.status).toBe(200);
    });

    it('should allow access to auth page', () => {
      mockIsPublicRoute.mockReturnValue(true);
      const request = createRequest('/auth');

      const response = middleware(request);

      expect(mockIsPublicRoute).toHaveBeenCalledWith('/auth');
      expect(response.status).toBe(200);
    });
  });

  describe('protected routes without authentication', () => {
    beforeEach(() => {
      mockIsPublicRoute.mockReturnValue(false);
    });

    it('should redirect to auth when no auth cookie exists', () => {
      const request = createRequest('/videos');

      const response = middleware(request);

      expect(response.status).toBe(307); // NextResponse.redirect uses 307
      expect(response.headers.get('location')).toEqual('https://localhost:3000/auth?returnUrl=%2Fvideos');
    });

    it('should redirect to auth with query parameters preserved', () => {
      const request = createRequest('/videos', 'page=2&filter=watched');

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://localhost:3000/auth?returnUrl=%2Fvideos%3Fpage%3D2%26filter%3Dwatched');
    });

    it('should redirect to auth when auth cookie is invalid JSON', () => {
      const request = createRequestWithCookies('/channels', {
        'youtube-gallery-auth': ''
      });

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://localhost:3000/auth?returnUrl=%2Fchannels');
    });
  });

  describe('protected routes with valid authentication', () => {
    beforeEach(() => {
      mockIsPublicRoute.mockReturnValue(false);
    });

    it('should allow access when auth cookie contains valid data', () => {
      const authData = JSON.stringify({
        state: {
          user: { id: '123', name: 'Test User' },
          token: 'valid-token',
          isAuthenticated: true
        }
      });
      const request = createRequestWithCookies('/videos', {
        'youtube-gallery-auth': authData
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('should allow access to subpaths of protected routes', () => {
      const authData = JSON.stringify({
        state: {
          user: { id: '123', name: 'Test User' },
          token: 'valid-token',
          isAuthenticated: true
        }
      });
      const request = createRequestWithCookies('/videos/123', {
        'youtube-gallery-auth': authData
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('should preserve query parameters when allowing access', () => {
      const authData = JSON.stringify({
        state: {
          user: { id: '123', name: 'Test User' },
          token: 'valid-token',
          isAuthenticated: true
        }
      });
      const request = createRequestWithCookies('/channels?search=test&page=1', {
        'youtube-gallery-auth': authData
      });

      const response = middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockIsPublicRoute.mockReturnValue(false);
    });

    it('should handle complex query parameters in return URL', () => {
      const complexQuery = 'page=2&tags=react,typescript&search=hello%20world&sort=date';
      const request = createRequest('/videos', complexQuery);

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://localhost:3000/auth?returnUrl=%2Fvideos%3Fpage%3D2%26tags%3Dreact%2Ctypescript%26search%3Dhello%2520world%26sort%3Ddate');
    });

    it('should handle empty string values in auth data', () => {
      const request = createRequestWithCookies('/videos', {
        'youtube-gallery-auth': ''
      });

      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://localhost:3000/auth?returnUrl=%2Fvideos');
    });
  });

  describe('route classification', () => {
    it('should call isPublicRoute with correct pathname', () => {
      mockIsPublicRoute.mockReturnValue(true);
      const request = createRequest('/some-path');

      middleware(request);

      expect(mockIsPublicRoute).toHaveBeenCalledWith('/some-path');
      expect(mockIsPublicRoute).toHaveBeenCalledTimes(1);
    });

    it('should handle root path correctly', () => {
      mockIsPublicRoute.mockReturnValue(true);
      const request = createRequest('/');

      const response = middleware(request);

      expect(mockIsPublicRoute).toHaveBeenCalledWith('/');
      expect(response.status).toBe(200);
    });

    it('should handle paths with trailing slashes', () => {
      mockIsPublicRoute.mockReturnValue(false);
      const request = createRequest('/videos/');

      const response = middleware(request);

      expect(mockIsPublicRoute).toHaveBeenCalledWith('/videos/');
      expect(response.status).toBe(307);
    });
  });
});