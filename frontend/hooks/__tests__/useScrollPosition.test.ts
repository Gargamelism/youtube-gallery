import { renderHook } from '@testing-library/react';
import { useScrollPosition } from '../useScrollPosition';
import { VideoFilters, TagMode, NotInterestedFilter } from '@/types';
import { storage } from '@/lib/storage';

const mockFilters: VideoFilters = {
  filter: 'all',
  selectedTags: [],
  tagMode: TagMode.ANY,
  searchQuery: '',
  notInterestedFilter: NotInterestedFilter.EXCLUDE,
};

const mockPosition = {
  scrollY: 1000,
  loadedPages: 3,
  timestamp: Date.now(),
  filters: mockFilters,
};

describe('useScrollPosition', () => {
  beforeEach(() => {
    storage.clearSession();
    jest.clearAllMocks();
  });

  it('saves scroll position to sessionStorage', () => {
    const { result } = renderHook(() => useScrollPosition('videos'));

    result.current.savePosition(mockPosition);

    const saved = storage.getScrollPosition('videos');
    expect(saved).toBeTruthy();
    expect(saved).toEqual(mockPosition);
  });

  it('retrieves saved scroll position', () => {
    const { result } = renderHook(() => useScrollPosition('videos'));

    result.current.savePosition(mockPosition);
    const retrieved = result.current.getPosition();

    expect(retrieved).toEqual(mockPosition);
  });

  it('returns null when no position is saved', () => {
    const { result } = renderHook(() => useScrollPosition('videos'));

    const retrieved = result.current.getPosition();

    expect(retrieved).toBeNull();
  });

  it('clears saved position', () => {
    const { result } = renderHook(() => useScrollPosition('videos'));

    result.current.savePosition(mockPosition);
    expect(result.current.getPosition()).toEqual(mockPosition);

    result.current.clearPosition();
    expect(result.current.getPosition()).toBeNull();
  });

  it('expires position after 30 minutes', () => {
    const { result } = renderHook(() => useScrollPosition('videos'));

    const expiredPosition = {
      ...mockPosition,
      timestamp: Date.now() - 31 * 60 * 1000,
    };

    result.current.savePosition(expiredPosition);
    const retrieved = result.current.getPosition();

    expect(retrieved).toBeNull();
    expect(storage.getScrollPosition('videos')).toBeNull();
  });

  it('uses different keys for different contexts', () => {
    const { result: result1 } = renderHook(() => useScrollPosition('videos'));
    const { result: result2 } = renderHook(() => useScrollPosition('channels'));

    result1.current.savePosition(mockPosition);

    expect(result1.current.getPosition()).toEqual(mockPosition);
    expect(result2.current.getPosition()).toBeNull();
  });
});
