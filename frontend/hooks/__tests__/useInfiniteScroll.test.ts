import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';
import { VideoFilters, TagMode, NotInterestedFilter } from '@/types';

const mockFilters: VideoFilters = {
  filter: 'all',
  selectedTags: [],
  tagMode: TagMode.ANY,
  searchQuery: '',
  notInterestedFilter: NotInterestedFilter.EXCLUDE,
};

const mockFetchNextPage = jest.fn();
const mockSavePosition = jest.fn();

jest.mock('../useScrollPosition', () => ({
  useScrollPosition: () => ({
    savePosition: mockSavePosition,
    getPosition: jest.fn(),
    clearPosition: jest.fn(),
  }),
}));

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('returns loading ref', () => {
    const { result } = renderHook(() => useInfiniteScroll(mockFetchNextPage, true, false, 1, mockFilters));

    expect(result.current.current).toBe(null);
  });

  it('does not save position on page count change', () => {
    const { rerender } = renderHook(
      ({ currentPageCount }) => useInfiniteScroll(mockFetchNextPage, true, false, currentPageCount, mockFilters),
      { initialProps: { currentPageCount: 1 } }
    );

    expect(mockSavePosition).toHaveBeenCalledTimes(1);

    rerender({ currentPageCount: 2 });

    expect(mockSavePosition).toHaveBeenCalledTimes(1);
  });

  it('saves position when filters change', () => {
    const newFilters: VideoFilters = {
      filter: 'watched',
      selectedTags: [],
      tagMode: TagMode.ANY,
      searchQuery: '',
      notInterestedFilter: NotInterestedFilter.EXCLUDE,
    };

    const { rerender } = renderHook(({ filters }) => useInfiniteScroll(mockFetchNextPage, true, false, 1, filters), {
      initialProps: { filters: mockFilters },
    });

    expect(mockSavePosition).toHaveBeenCalledTimes(1);

    rerender({ filters: newFilters });

    expect(mockSavePosition).toHaveBeenCalledTimes(2);
  });
});
