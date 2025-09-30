import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInfiniteVideos } from '../useInfiniteVideos';
import * as services from '@/services';
import { VideoFilters } from '../useVideoFilters';

const mockFilters: VideoFilters = {
  filter: 'all',
  selectedTags: [],
  tagMode: 'any',
};

const mockVideosPage1 = {
  data: {
    results: [
      { uuid: '1', title: 'Video 1', is_watched: false },
      { uuid: '2', title: 'Video 2', is_watched: false },
    ],
    next: 'http://localhost:8000/api/videos?page=2',
  },
};

const mockVideosPage2 = {
  data: {
    results: [
      { uuid: '3', title: 'Video 3', is_watched: false },
      { uuid: '4', title: 'Video 4', is_watched: false },
    ],
    next: null,
  },
};

jest.mock('@/services', () => ({
  fetchVideos: jest.fn(),
}));

jest.mock('../useScrollPosition', () => ({
  useScrollPosition: () => ({
    getPosition: jest.fn(() => null),
    savePosition: jest.fn(),
    clearPosition: jest.fn(),
  }),
}));

const mockFetchVideos = services.fetchVideos as jest.MockedFunction<typeof services.fetchVideos>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockAreFiltersEqual = (otherFilters: VideoFilters) =>
  JSON.stringify(mockFilters) === JSON.stringify(otherFilters);

describe('useInfiniteVideos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchVideos.mockResolvedValue(mockVideosPage1);
  });

  it('fetches initial page of videos', async () => {
    const { result } = renderHook(() => useInfiniteVideos(mockFilters, mockAreFiltersEqual), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchVideos).toHaveBeenCalledWith({
      filter: 'all',
      selectedTags: [],
      tagMode: 'any',
      page: 1,
      page_size: 24,
    });
  });

  it('fetches next page when fetchNextPage is called', async () => {
    mockFetchVideos
      .mockResolvedValueOnce(mockVideosPage1)
      .mockResolvedValueOnce(mockVideosPage2);

    const { result } = renderHook(() => useInfiniteVideos(mockFilters, mockAreFiltersEqual), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.data?.pages).toHaveLength(2);
    });

    expect(mockFetchVideos).toHaveBeenCalledTimes(2);
    expect(mockFetchVideos).toHaveBeenLastCalledWith({
      filter: 'all',
      selectedTags: [],
      tagMode: 'any',
      page: 2,
      page_size: 24,
    });
  });

  it('sets hasNextPage to false when no next page', async () => {
    mockFetchVideos.mockResolvedValue({
      data: {
        results: [{ uuid: '1', title: 'Video 1', is_watched: false }],
        next: null,
      },
    });

    const { result } = renderHook(() => useInfiniteVideos(mockFilters, mockAreFiltersEqual), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it('does not restore scroll position when no saved position exists', async () => {
    const { result } = renderHook(() => useInfiniteVideos(mockFilters, mockAreFiltersEqual), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isRestoring).toBe(false);
  });
});