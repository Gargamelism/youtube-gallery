import { updateUrlParams, navigateWithUpdatedParams } from '../urlHelpers';
import { ReadonlyURLSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter: AppRouterInstance = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
} as any;

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