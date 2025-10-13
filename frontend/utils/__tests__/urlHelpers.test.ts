import { updateUrlParams, navigateWithUpdatedParams, sanitizeReturnUrl, getReturnUrl } from '../urlHelpers';
import { ReadonlyURLSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter: AppRouterInstance = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const createSearchParams = (queryString: string): ReadonlyURLSearchParams => {
  return new URLSearchParams(queryString) as ReadonlyURLSearchParams;
};

describe('updateUrlParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adding new parameters', () => {
    it('adds new parameters to empty search params', () => {
      const searchParams = createSearchParams('');
      const result = updateUrlParams(searchParams, {
        filter: 'watched',
        page: '2'
      });

      expect(result).toBe('filter=watched&page=2');
    });

    it('adds new parameters to existing search params', () => {
      const searchParams = createSearchParams('existing=value');
      const result = updateUrlParams(searchParams, {
        filter: 'unwatched',
        sort: 'date'
      });

      expect(result).toBe('existing=value&filter=unwatched&sort=date');
    });

    it('handles string values', () => {
      const searchParams = createSearchParams('');
      const result = updateUrlParams(searchParams, {
        search: 'react tutorial',
        category: 'tech'
      });

      expect(result).toBe('search=react+tutorial&category=tech');
    });
  });

  describe('updating existing parameters', () => {
    it('updates existing parameter values', () => {
      const searchParams = createSearchParams('page=1&filter=all');
      const result = updateUrlParams(searchParams, {
        page: '3',
        filter: 'watched'
      });

      expect(result).toBe('page=3&filter=watched');
    });

    it('preserves unmodified parameters', () => {
      const searchParams = createSearchParams('page=1&filter=all&sort=date');
      const result = updateUrlParams(searchParams, {
        filter: 'unwatched'
      });

      expect(result).toBe('page=1&filter=unwatched&sort=date');
    });
  });

  describe('removing parameters', () => {
    it('removes parameters when value is undefined', () => {
      const searchParams = createSearchParams('page=1&filter=all&sort=date');
      const result = updateUrlParams(searchParams, {
        filter: undefined,
        sort: undefined
      });

      expect(result).toBe('page=1');
    });

    it('removes all parameters when all values are undefined', () => {
      const searchParams = createSearchParams('page=1&filter=all');
      const result = updateUrlParams(searchParams, {
        page: undefined,
        filter: undefined
      });

      expect(result).toBe('');
    });
  });

  describe('array parameter handling', () => {
    it('converts arrays to comma-separated strings', () => {
      const searchParams = createSearchParams('');
      const result = updateUrlParams(searchParams, {
        tags: ['react', 'javascript', 'tutorial'],
        categories: ['tech', 'programming']
      });

      expect(result).toBe('tags=react%2Cjavascript%2Ctutorial&categories=tech%2Cprogramming');
    });

    it('removes parameters when array is empty', () => {
      const searchParams = createSearchParams('tags=react,js&filter=all');
      const result = updateUrlParams(searchParams, {
        tags: [],
        filter: 'watched'
      });

      expect(result).toBe('filter=watched');
    });

    it('updates existing array parameters', () => {
      const searchParams = createSearchParams('tags=old,values&other=param');
      const result = updateUrlParams(searchParams, {
        tags: ['new', 'values', 'updated']
      });

      expect(result).toBe('tags=new%2Cvalues%2Cupdated&other=param');
    });
  });

  describe('edge cases', () => {
    it('handles empty updates object', () => {
      const searchParams = createSearchParams('page=1&filter=all');
      const result = updateUrlParams(searchParams, {});

      expect(result).toBe('page=1&filter=all');
    });

    it('handles special characters in values', () => {
      const searchParams = createSearchParams('');
      const result = updateUrlParams(searchParams, {
        search: 'hello & world!',
        title: 'video #1 (part 2)'
      });

      expect(result).toBe('search=hello+%26+world%21&title=video+%231+%28part+2%29');
    });

    it('handles empty string values', () => {
      const searchParams = createSearchParams('page=1');
      const result = updateUrlParams(searchParams, {
        search: '',
        filter: 'all'
      });

      expect(result).toBe('page=1&search=&filter=all');
    });

    it('URLSearchParams.set() replaces all values for duplicate keys', () => {
      const searchParams = createSearchParams('tag=react&tag=js');
      const result = updateUrlParams(searchParams, {
        tag: 'vue',
        page: '1'
      });

      expect(result).toBe('tag=vue&page=1');
    });
  });
});

describe('navigateWithUpdatedParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic navigation', () => {
    it('navigates to pathname with updated query string', () => {
      const searchParams = createSearchParams('page=1');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        { filter: 'watched', page: '2' }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos?page=2&filter=watched');
    });

    it('navigates to pathname without query string when no params', () => {
      const searchParams = createSearchParams('page=1');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        { page: undefined }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos');
    });

    it('handles root pathname', () => {
      const searchParams = createSearchParams('');

      navigateWithUpdatedParams(
        mockRouter,
        '/',
        searchParams,
        { search: 'react' }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/?search=react');
    });
  });

  describe('complex navigation scenarios', () => {
    it('handles deep pathnames with multiple segments', () => {
      const searchParams = createSearchParams('tab=overview');

      navigateWithUpdatedParams(
        mockRouter,
        '/dashboard/videos/analytics',
        searchParams,
        { tab: 'performance', period: '7d' }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/videos/analytics?tab=performance&period=7d');
    });

    it('preserves existing parameters while updating others', () => {
      const searchParams = createSearchParams('sort=date&order=desc&page=1');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        { page: '2', filter: 'watched' }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos?sort=date&order=desc&page=2&filter=watched');
    });
  });

  describe('array and complex parameter handling', () => {
    it('handles array parameters in navigation', () => {
      const searchParams = createSearchParams('');

      navigateWithUpdatedParams(
        mockRouter,
        '/search',
        searchParams,
        {
          tags: ['react', 'typescript'],
          categories: ['tutorial', 'beginner']
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/search?tags=react%2Ctypescript&categories=tutorial%2Cbeginner');
    });

    it('removes parameters when arrays are empty', () => {
      const searchParams = createSearchParams('tags=old,tags&filter=all');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        {
          tags: [],
          filter: 'watched'
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos?filter=watched');
    });
  });

  describe('edge cases', () => {
    it('handles empty updates gracefully', () => {
      const searchParams = createSearchParams('existing=param');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        {}
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos?existing=param');
    });

    it('handles all parameters being removed', () => {
      const searchParams = createSearchParams('page=1&filter=all');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        {
          page: undefined,
          filter: undefined
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos');
    });

    it('handles special characters in pathname and parameters', () => {
      const searchParams = createSearchParams('');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos/search results',
        searchParams,
        {
          q: 'hello & world',
          type: 'video #1'
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos/search results?q=hello+%26+world&type=video+%231');
    });
  });

  describe('router integration', () => {
    it('calls router.push exactly once', () => {
      const searchParams = createSearchParams('page=1');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        { filter: 'watched' }
      );

      expect(mockRouter.push).toHaveBeenCalledTimes(1);
    });

    it('does not call other router methods', () => {
      const searchParams = createSearchParams('page=1');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        { filter: 'watched' }
      );

      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(mockRouter.forward).not.toHaveBeenCalled();
      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });
});

describe('integration tests', () => {
  it('updateUrlParams and navigateWithUpdatedParams work together', () => {
    const searchParams = createSearchParams('page=1&sort=date');
    const updates = { page: '3', filter: 'watched', sort: undefined };

    const queryString = updateUrlParams(searchParams, updates);
    expect(queryString).toBe('page=3&filter=watched');

    navigateWithUpdatedParams(mockRouter, '/videos', searchParams, updates);
    expect(mockRouter.push).toHaveBeenCalledWith('/videos?page=3&filter=watched');
  });

  describe('real-world YouTube gallery scenarios', () => {
    it('handles video filtering navigation', () => {
      const searchParams = createSearchParams('page=1');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        {
          status: 'watched',
          page: undefined
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos?status=watched');
    });

    it('handles search with tag filtering', () => {
      const searchParams = createSearchParams('');

      navigateWithUpdatedParams(
        mockRouter,
        '/search',
        searchParams,
        {
          q: 'react tutorial',
          tags: ['beginner', 'javascript'],
          sort: 'relevance'
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/search?q=react+tutorial&tags=beginner%2Cjavascript&sort=relevance');
    });

    it('handles pagination while preserving filters', () => {
      const searchParams = createSearchParams('status=unwatched&tags=react,tutorial&sort=date');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        { page: '2' }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos?status=unwatched&tags=react%2Ctutorial&sort=date&page=2');
    });

    it('handles clearing all filters', () => {
      const searchParams = createSearchParams('status=watched&tags=react,vue&sort=date&page=3');

      navigateWithUpdatedParams(
        mockRouter,
        '/videos',
        searchParams,
        {
          status: undefined,
          tags: [],
          sort: undefined,
          page: undefined
        }
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/videos');
    });
  });
});

describe('sanitizeReturnUrl', () => {
  const defaultFallback = '/';

  describe('valid protected routes', () => {
    it('should allow valid protected routes', () => {
      expect(sanitizeReturnUrl('/videos')).toBe('/videos');
      expect(sanitizeReturnUrl('/channels')).toBe('/channels');
    });

    it('should allow protected routes with query parameters', () => {
      expect(sanitizeReturnUrl('/videos?page=2')).toBe('/videos?page=2');
      expect(sanitizeReturnUrl('/channels?search=test')).toBe('/channels?search=test');
    });

    it('should allow protected routes with subpaths', () => {
      expect(sanitizeReturnUrl('/videos/123')).toBe('/videos/123');
      expect(sanitizeReturnUrl('/channels/abc/edit')).toBe('/channels/abc/edit');
    });

    it('should add leading slash to relative paths', () => {
      expect(sanitizeReturnUrl('videos')).toBe('/videos');
      expect(sanitizeReturnUrl('channels')).toBe('/channels');
    });
  });

  describe('invalid inputs - null/undefined/empty', () => {
    it('should return fallback for null', () => {
      expect(sanitizeReturnUrl(null)).toBe(defaultFallback);
    });

    it('should return fallback for undefined', () => {
      expect(sanitizeReturnUrl(undefined)).toBe(defaultFallback);
    });

    it('should return fallback for empty string', () => {
      expect(sanitizeReturnUrl('')).toBe(defaultFallback);
    });

    it('should return fallback for whitespace-only string', () => {
      expect(sanitizeReturnUrl('   ')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('\n\t')).toBe(defaultFallback);
    });

    it('should return custom fallback when provided', () => {
      const customFallback = '/custom';
      expect(sanitizeReturnUrl(null, customFallback)).toBe(customFallback);
      expect(sanitizeReturnUrl('', customFallback)).toBe(customFallback);
    });
  });

  describe('open redirect prevention - absolute URLs', () => {
    it('should block http:// URLs', () => {
      expect(sanitizeReturnUrl('http://evil.com')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('http://evil.com/videos')).toBe(defaultFallback);
    });

    it('should block https:// URLs', () => {
      expect(sanitizeReturnUrl('https://evil.com')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('https://evil.com/channels')).toBe(defaultFallback);
    });

    it('should block protocol-relative URLs', () => {
      expect(sanitizeReturnUrl('//evil.com')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('//evil.com/videos')).toBe(defaultFallback);
    });

    it('should block other protocols', () => {
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('data:text/html,<script>alert(1)</script>')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('ftp://evil.com')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('file:///etc/passwd')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('mailto:test@evil.com')).toBe(defaultFallback);
    });
  });

  describe('path traversal prevention', () => {
    it('should block ../ sequences', () => {
      expect(sanitizeReturnUrl('/videos/../admin')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/channels/../../../etc/passwd')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('../videos')).toBe(defaultFallback);
    });

    it('should block /.. sequences', () => {
      expect(sanitizeReturnUrl('/videos/..')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/channels/test/..')).toBe(defaultFallback);
    });
  });

  describe('public route blocking', () => {
    it('should block public routes (they should not be return URLs)', () => {
      expect(sanitizeReturnUrl('/')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/login')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/login?returnUrl=/videos')).toBe(defaultFallback);
    });
  });

  describe('unknown route blocking', () => {
    it('should block unknown/invalid routes', () => {
      expect(sanitizeReturnUrl('/admin')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/api')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/settings')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/random-route')).toBe(defaultFallback);
    });

    it('should block non-existent subpaths', () => {
      expect(sanitizeReturnUrl('/unknown/path')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/not-a-route')).toBe(defaultFallback);
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with fragments', () => {
      expect(sanitizeReturnUrl('/videos#section')).toBe('/videos#section');
      expect(sanitizeReturnUrl('/channels?tab=all#top')).toBe('/channels?tab=all#top');
    });

    it('should handle special characters in query params', () => {
      expect(sanitizeReturnUrl('/videos?q=hello%20world')).toBe('/videos?q=hello%20world');
      expect(sanitizeReturnUrl('/channels?name=test&sort=asc')).toBe('/channels?name=test&sort=asc');
    });

    it('should trim whitespace', () => {
      expect(sanitizeReturnUrl('  /videos  ')).toBe('/videos');
      expect(sanitizeReturnUrl('\t/channels\n')).toBe('/channels');
    });

    it('should handle case sensitivity', () => {
      expect(sanitizeReturnUrl('/Videos')).toBe(defaultFallback);
      expect(sanitizeReturnUrl('/CHANNELS')).toBe(defaultFallback);
    });
  });
});

describe('getReturnUrl', () => {
  it('should extract return URL from search params', () => {
    const searchParams = new URLSearchParams('returnUrl=/videos&other=test');
    expect(getReturnUrl(searchParams)).toBe('/videos');
  });

  it('should return default fallback when returnUrl is missing', () => {
    const searchParams = new URLSearchParams('other=test');
    expect(getReturnUrl(searchParams)).toBe('/videos');
  });

  it('should return custom fallback when provided', () => {
    const searchParams = new URLSearchParams('other=test');
    expect(getReturnUrl(searchParams, '/custom')).toBe('/custom');
  });

  it('should delegate sanitization to sanitizeReturnUrl', () => {
    const searchParams = new URLSearchParams('returnUrl=https://evil.com');
    expect(getReturnUrl(searchParams)).toBe('/videos');
  });
});