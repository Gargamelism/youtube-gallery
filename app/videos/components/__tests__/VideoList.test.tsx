import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VideoList } from '../VideoList';
import { TagMode, Video } from '@/types';
import { ScrollMode } from '@/lib/scrollMode';
import * as services from '@/services';

const createMockVideo = (uuid: string, title: string, isWatched: boolean, channelTitle: string): Video => ({
  uuid,
  video_id: `vid_${uuid}`,
  channel_title: channelTitle,
  title,
  description: null,
  published_at: '2024-01-01T00:00:00Z',
  duration: '10:00',
  view_count: null,
  like_count: null,
  comment_count: null,
  thumbnail_url: `https://i.ytimg.com/vi/thumb${uuid}/maxresdefault.jpg`,
  video_url: `https://youtube.com/${uuid}`,
  is_watched: isWatched,
  watched_at: isWatched ? '2024-01-01T00:00:00Z' : null,
  notes: null,
  channel_tags: [],
});

const mockVideos = [
  createMockVideo('1', 'Test Video 1', false, 'Tech Channel'),
  createMockVideo('2', 'Test Video 2', true, 'Gaming Channel'),
];

jest.mock('@/services', () => ({
  fetchVideos: jest.fn(),
  updateVideoWatchStatus: jest.fn(),
}));

jest.mock('@/hooks/useVideoFilters', () => ({
  useVideoFilters: () => ({
    filter: 'all',
    selectedTags: [],
    tagMode: TagMode.ANY,
    areFiltersEqual: jest.fn(() => true),
  }),
}));

jest.mock('@/hooks/useScrollPosition', () => ({
  useScrollPosition: () => ({
    savePosition: jest.fn(),
    getPosition: jest.fn(() => null),
    clearPosition: jest.fn(),
  }),
}));

jest.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ current: null }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const mockFetchVideos = services.fetchVideos as jest.MockedFunction<typeof services.fetchVideos>;
const mockUpdateVideoWatchStatus = services.updateVideoWatchStatus as jest.MockedFunction<typeof services.updateVideoWatchStatus>;

describe('VideoList', () => {
  beforeEach(() => {
    mockFetchVideos.mockResolvedValue({
      data: {
        results: mockVideos,
        next: null,
        previous: null,
        count: mockVideos.length,
      },
    });
    jest.clearAllMocks();
  });

  it('renders video list', async () => {
    render(
      <TestWrapper>
        <VideoList scrollMode={ScrollMode.AUTO} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
      expect(screen.getByText('Test Video 2')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockFetchVideos.mockImplementation(() => new Promise(() => {}));

    const { container } = render(
      <TestWrapper>
        <VideoList scrollMode={ScrollMode.AUTO} />
      </TestWrapper>
    );

    const skeletonCards = container.querySelectorAll('[role="status"][aria-label="Loading channel"]');
    expect(skeletonCards.length).toBeGreaterThan(0);

    const animatedSkeletons = container.querySelectorAll('.animate-pulse');
    expect(animatedSkeletons.length).toBeGreaterThan(0);
  });

  it('handles watch status toggle', async () => {
    mockUpdateVideoWatchStatus.mockResolvedValue({
      data: {
        status: 'success',
        is_watched: true,
        watched_at: '2024-01-01T00:00:00Z',
        notes: null,
      },
    });

    render(
      <TestWrapper>
        <VideoList scrollMode={ScrollMode.AUTO} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
    });

    const watchButton = document.querySelector('.VideoCard__watch-button');
    fireEvent.click(watchButton!);

    await waitFor(() => {
      expect(mockUpdateVideoWatchStatus).toHaveBeenCalledWith('1', true);
    });
  });


});