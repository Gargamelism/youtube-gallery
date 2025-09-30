import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';
import { VideoFilters } from '../useVideoFilters';

const mockFilters: VideoFilters = {
  filter: 'all',
  selectedTags: [],
  tagMode: 'any',
};

const mockFetchNextPage = jest.fn();

jest.mock('../useScrollPosition', () => ({
  useScrollPosition: () => ({
    savePosition: jest.fn(),
  }),
}));

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('returns loading ref', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll(mockFetchNextPage, true, false, 1, mockFilters)
    );

    expect(result.current.current).toBe(null);
  });

  it('does not save position on page count change', () => {
    const mockSavePosition = jest.fn();
    jest.spyOn(require('../useScrollPosition'), 'useScrollPosition').mockReturnValue({
      savePosition: mockSavePosition,
    });

    const { rerender } = renderHook(
      ({ currentPageCount }) => useInfiniteScroll(mockFetchNextPage, true, false, currentPageCount, mockFilters),
      { initialProps: { currentPageCount: 1 } }
    );

    expect(mockSavePosition).toHaveBeenCalledTimes(1);

    rerender({ currentPageCount: 2 });

    expect(mockSavePosition).toHaveBeenCalledTimes(1);
  });

  it('saves position when filters change', () => {
    const mockSavePosition = jest.fn();
    jest.spyOn(require('../useScrollPosition'), 'useScrollPosition').mockReturnValue({
      savePosition: mockSavePosition,
    });

    const newFilters: VideoFilters = {
      filter: 'watched',
      selectedTags: [],
      tagMode: 'any',
    };

    const { rerender } = renderHook(
      ({ filters }) => useInfiniteScroll(mockFetchNextPage, true, false, 1, filters),
      { initialProps: { filters: mockFilters } }
    );

    expect(mockSavePosition).toHaveBeenCalledTimes(1);

    rerender({ filters: newFilters });

    expect(mockSavePosition).toHaveBeenCalledTimes(2);
  });
});