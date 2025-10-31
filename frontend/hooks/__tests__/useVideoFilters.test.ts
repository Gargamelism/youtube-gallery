import { renderHook, act } from '@testing-library/react';
import { useVideoFilters } from '../useVideoFilters';
import { TagMode, NotInterestedFilter } from '@/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter: AppRouterInstance = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const mockPathname = '/videos';

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

let mockSearchParamsString = '';

describe('useVideoFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsString = '';
  });

  describe('Initial state parsing', () => {
    it('returns default values when URL params are missing', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.filter).toBe('unwatched');
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.tagMode).toBe(TagMode.ANY);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.notInterestedFilter).toBe(NotInterestedFilter.EXCLUDE);
    });

    it('parses all filter params from URL', () => {
      mockSearchParamsString = 'filter=watched&tags=tech,tutorial&tag_mode=all&search=nextjs&not_interested_filter=only';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.filter).toBe('watched');
      expect(result.current.selectedTags).toEqual(['tech', 'tutorial']);
      expect(result.current.tagMode).toBe(TagMode.ALL);
      expect(result.current.searchQuery).toBe('nextjs');
      expect(result.current.notInterestedFilter).toBe(NotInterestedFilter.ONLY);
    });

    it('defaults notInterestedFilter to EXCLUDE when invalid', () => {
      mockSearchParamsString = 'not_interested_filter=invalid';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.notInterestedFilter).toBe(NotInterestedFilter.EXCLUDE);
    });
  });

  describe('notInterestedFilter updates', () => {
    it('updates notInterestedFilter to ONLY', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.ONLY);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('not_interested_filter=only')
      );
    });

    it('updates notInterestedFilter to INCLUDE', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.INCLUDE);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('not_interested_filter=include')
      );
    });

    it('updates notInterestedFilter to EXCLUDE', () => {
      mockSearchParamsString = 'not_interested_filter=only';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.EXCLUDE);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('not_interested_filter=exclude')
      );
    });

    it('preserves other filters when updating notInterestedFilter', () => {
      mockSearchParamsString = 'filter=watched&tags=tech';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.ONLY);
      });

      const pushCall = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).toContain('filter=watched');
      expect(pushCall).toContain('tags=tech');
      expect(pushCall).toContain('not_interested_filter=only');
    });
  });

  describe('areFiltersEqual', () => {
    it('returns true when all filters match including notInterestedFilter', () => {
      mockSearchParamsString = 'filter=watched&not_interested_filter=only';
      const { result } = renderHook(() => useVideoFilters());

      const isEqual = result.current.areFiltersEqual({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.ONLY,
      });

      expect(isEqual).toBe(true);
    });

    it('returns false when notInterestedFilter differs', () => {
      mockSearchParamsString = 'filter=watched&not_interested_filter=exclude';
      const { result } = renderHook(() => useVideoFilters());

      const isEqual = result.current.areFiltersEqual({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.ONLY,
      });

      expect(isEqual).toBe(false);
    });

    it('returns false when other filters differ but notInterestedFilter matches', () => {
      mockSearchParamsString = 'filter=watched&not_interested_filter=exclude';
      const { result } = renderHook(() => useVideoFilters());

      const isEqual = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(isEqual).toBe(false);
    });
  });

  describe('Combined filter operations', () => {
    it('handles multiple filter updates correctly', () => {
      const { result, rerender } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateFilter('watched');
      });

      mockSearchParamsString = 'filter=watched&not_interested_filter=exclude';
      rerender();

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.ONLY);
      });

      const lastPushCall = (mockRouter.push as jest.Mock).mock.calls.slice(-1)[0][0];
      expect(lastPushCall).toContain('filter=watched');
      expect(lastPushCall).toContain('not_interested_filter=only');
    });

    it('includes notInterestedFilter in URL when updating other filters', () => {
      mockSearchParamsString = 'not_interested_filter=only';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateFilter('watched');
      });

      const pushCall = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).toContain('not_interested_filter=only');
      expect(pushCall).toContain('filter=watched');
    });
  });

  describe('Filter combinations', () => {
    it('supports all three notInterestedFilter modes', () => {
      const modes = [
        NotInterestedFilter.EXCLUDE,
        NotInterestedFilter.ONLY,
        NotInterestedFilter.INCLUDE,
      ];

      modes.forEach(mode => {
        const { result } = renderHook(() => useVideoFilters());

        act(() => {
          result.current.updateNotInterestedFilter(mode);
        });

        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining(`not_interested_filter=${mode}`)
        );
      });
    });
  });
});
