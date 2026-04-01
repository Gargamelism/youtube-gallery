import { renderHook, act } from '@testing-library/react';
import { useVideoFilters } from '../useVideoFilters';
import { TagMode, NotInterestedFilter, VideoSortMode } from '@/types';
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
      mockSearchParamsString =
        'filter=watched&tags=tech,tutorial&tag_mode=all&search=nextjs&not_interested_filter=only';

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

    it('defaults sort to in_progress_first when URL param is missing', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.sort).toBe('in_progress_first');
    });

    it('parses sort=newest from URL', () => {
      mockSearchParamsString = 'sort=newest';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.sort).toBe<VideoSortMode>('newest');
    });

    it('parses sort=in_progress_first from URL', () => {
      mockSearchParamsString = 'sort=in_progress_first';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.sort).toBe<VideoSortMode>('in_progress_first');
    });
  });

  describe('sort updates', () => {
    it('updateSort sets sort param in URL', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateSort('newest');
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('sort=newest'));
    });

    it('updateSort clears page param', () => {
      mockSearchParamsString = 'page=3';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateSort('in_progress_first');
      });

      const pushCall = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).not.toContain('page=');
    });

    it('updateSort preserves other filters', () => {
      mockSearchParamsString = 'filter=watched&tags=tech&not_interested_filter=only';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateSort('newest');
      });

      const pushCall = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).toContain('sort=newest');
      expect(pushCall).toContain('filter=watched');
      expect(pushCall).toContain('tags=tech');
      expect(pushCall).toContain('not_interested_filter=only');
    });
  });

  describe('notInterestedFilter updates', () => {
    it('updates notInterestedFilter to ONLY', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.ONLY);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('not_interested_filter=only'));
    });

    it('updates notInterestedFilter to INCLUDE', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.INCLUDE);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('not_interested_filter=include'));
    });

    it('updates notInterestedFilter to EXCLUDE', () => {
      mockSearchParamsString = 'not_interested_filter=only';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateNotInterestedFilter(NotInterestedFilter.EXCLUDE);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('not_interested_filter=exclude'));
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
        sort: 'in_progress_first',
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
        sort: 'in_progress_first',
      });

      expect(isEqual).toBe(false);
    });

    it('returns false when sort differs', () => {
      mockSearchParamsString = 'sort=newest';
      const { result } = renderHook(() => useVideoFilters());

      const isEqual = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        sort: 'in_progress_first',
      });

      expect(isEqual).toBe(false);
    });

    it('returns true when sort matches', () => {
      mockSearchParamsString = 'sort=newest';
      const { result } = renderHook(() => useVideoFilters());

      const isEqual = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        sort: 'newest',
      });

      expect(isEqual).toBe(true);
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
        sort: 'in_progress_first',
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

  describe('EXCEPT tag mode', () => {
    it('parses EXCEPT tag mode from URL', () => {
      mockSearchParamsString = 'tags=yoga,cooking&tag_mode=except';

      const { result } = renderHook(() => useVideoFilters());

      expect(result.current.tagMode).toBe(TagMode.EXCEPT);
      expect(result.current.selectedTags).toEqual(['yoga', 'cooking']);
    });

    it('updates tag mode to EXCEPT', () => {
      mockSearchParamsString = 'tags=yoga,cooking&tag_mode=any';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateTagMode(TagMode.EXCEPT);
      });

      const pushCall = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).toContain('tag_mode=except');
    });

    it('includes tag_mode in URL for single tag selection', () => {
      mockSearchParamsString = 'tags=yoga&tag_mode=except';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateFilter('watched');
      });

      const pushCall = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushCall).toContain('tag_mode=except');
    });
  });

  describe('Filter combinations', () => {
    it('supports all three notInterestedFilter modes', () => {
      const modes = [NotInterestedFilter.EXCLUDE, NotInterestedFilter.ONLY, NotInterestedFilter.INCLUDE];

      modes.forEach(mode => {
        const { result } = renderHook(() => useVideoFilters());

        act(() => {
          result.current.updateNotInterestedFilter(mode);
        });

        expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining(`not_interested_filter=${mode}`));
      });
    });
  });

  describe('shorterThan URL parsing', () => {
    it('returns undefined when shorter_than is absent', () => {
      mockSearchParamsString = '';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.shorterThan).toBeUndefined();
    });

    it('parses shorter_than=10 as number 10', () => {
      mockSearchParamsString = 'shorter_than=10';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.shorterThan).toBe(10);
    });

    it('returns undefined when shorter_than=0', () => {
      mockSearchParamsString = 'shorter_than=0';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.shorterThan).toBeUndefined();
    });

    it('returns undefined for a non-numeric shorter_than value', () => {
      mockSearchParamsString = 'shorter_than=abc';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.shorterThan).toBeUndefined();
    });
  });

  describe('longerThan URL parsing', () => {
    it('returns undefined when longer_than is absent', () => {
      mockSearchParamsString = '';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.longerThan).toBeUndefined();
    });

    it('parses longer_than=20 as number 20', () => {
      mockSearchParamsString = 'longer_than=20';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.longerThan).toBe(20);
    });

    it('returns undefined when longer_than=0', () => {
      mockSearchParamsString = 'longer_than=0';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.longerThan).toBeUndefined();
    });
  });

  describe('isShort URL parsing', () => {
    it('returns undefined when is_short is absent', () => {
      mockSearchParamsString = '';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.isShort).toBeUndefined();
    });

    it('parses is_short=true', () => {
      mockSearchParamsString = 'is_short=true';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.isShort).toBe(true);
    });

    it('parses is_short=false', () => {
      mockSearchParamsString = 'is_short=false';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.isShort).toBe(false);
    });

    it('returns undefined for an invalid is_short value', () => {
      mockSearchParamsString = 'is_short=maybe';
      const { result } = renderHook(() => useVideoFilters());
      expect(result.current.isShort).toBeUndefined();
    });
  });

  describe('updateShorterThan', () => {
    it('sets shorter_than in URL when given a positive number', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateShorterThan(15);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('shorter_than=15'));
    });

    it('removes shorter_than from URL when set to undefined', () => {
      mockSearchParamsString = 'shorter_than=10';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateShorterThan(undefined);
      });

      const pushArg: string = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushArg).not.toContain('shorter_than');
    });
  });

  describe('updateLongerThan', () => {
    it('sets longer_than in URL when given a positive number', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateLongerThan(30);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('longer_than=30'));
    });

    it('removes longer_than from URL when set to undefined', () => {
      mockSearchParamsString = 'longer_than=20';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateLongerThan(undefined);
      });

      const pushArg: string = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushArg).not.toContain('longer_than');
    });
  });

  describe('updateIsShort', () => {
    it('sets is_short=true in URL', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateIsShort(true);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('is_short=true'));
    });

    it('sets is_short=false in URL', () => {
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateIsShort(false);
      });

      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('is_short=false'));
    });

    it('removes is_short from URL when set to undefined', () => {
      mockSearchParamsString = 'is_short=true';
      const { result } = renderHook(() => useVideoFilters());

      act(() => {
        result.current.updateIsShort(undefined);
      });

      const pushArg: string = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushArg).not.toContain('is_short');
    });
  });

  describe('areFiltersEqual with duration fields', () => {
    it('returns false when shorterThan differs', () => {
      mockSearchParamsString = 'shorter_than=10';
      const { result } = renderHook(() => useVideoFilters());

      const equal = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        sort: 'in_progress_first',
        shorterThan: 5,
      });
      expect(equal).toBe(false);
    });

    it('returns false when longerThan differs', () => {
      mockSearchParamsString = 'longer_than=20';
      const { result } = renderHook(() => useVideoFilters());

      const equal = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        sort: 'in_progress_first',
        longerThan: 30,
      });
      expect(equal).toBe(false);
    });

    it('returns false when isShort differs', () => {
      mockSearchParamsString = 'is_short=true';
      const { result } = renderHook(() => useVideoFilters());

      const equal = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        sort: 'in_progress_first',
        isShort: false,
      });
      expect(equal).toBe(false);
    });

    it('returns true when all duration/shorts fields match', () => {
      mockSearchParamsString = 'shorter_than=15&longer_than=5&is_short=false';
      const { result } = renderHook(() => useVideoFilters());

      const equal = result.current.areFiltersEqual({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        sort: 'in_progress_first',
        shorterThan: 15,
        longerThan: 5,
        isShort: false,
      });
      expect(equal).toBe(true);
    });
  });
});
