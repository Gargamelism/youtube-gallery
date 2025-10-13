import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInfiniteVideos } from '../useInfiniteVideos';
import * as services from '@/services';
import { VideoFilters, TagMode, Video } from '@/types';

const mockFilters: VideoFilters = {
  filter: 'all',
  selectedTags: [],
  tagMode: TagMode.ANY,
  searchQuery: '',
};

const createMockVideo = (uuid: string, title: string): Video => ({
  uuid,
  video_id: `vid_${uuid}`,
  channel_title: 'Test Channel',
  title,
  description: null,
  published_at: '2024-01-01T00:00:00Z',
  duration: '10:00',
  view_count: null,
  like_count: null,
  comment_count: null,
  thumbnail_url: `https://example.com/thumb_${uuid}.jpg`,
  video_url: `https://youtube.com/watch?v=${uuid}`,
  is_watched: false,
  watched_at: null,
  notes: null,
  channel_tags: [],
});

const mockVideosPage1 = {
  data: {
    count: 4,
    results: [createMockVideo('1', 'Video 1'), createMockVideo('2', 'Video 2')],
    next: 'http://localhost:8000/api/videos?page=2',
    previous: null,
  },
};

const mockVideosPage2 = {
  data: {
    count: 4,
    results: [createMockVideo('3', 'Video 3'), createMockVideo('4', 'Video 4')],
    next: null,
    previous: 'http://localhost:8000/api/videos?page=1',
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
      tagMode: TagMode.ANY,
      searchQuery: '',
      page: 1,
      page_size: 24,
    });
  });

  it('fetches next page when fetchNextPage is called', async () => {
    mockFetchVideos.mockResolvedValueOnce(mockVideosPage1).mockResolvedValueOnce(mockVideosPage2);

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
      tagMode: TagMode.ANY,
      searchQuery: '',
      page: 2,
      page_size: 24,
    });
  });

  it('sets hasNextPage to false when no next page', async () => {
    mockFetchVideos.mockResolvedValue({
      data: {
        count: 1,
        results: [createMockVideo('1', 'Video 1')],
        next: null,
        previous: null,
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
