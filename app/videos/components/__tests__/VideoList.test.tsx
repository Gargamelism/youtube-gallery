import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VideoList } from '../VideoList';
import { TagMode } from '@/types';
import * as services from '@/services';

const mockVideos = [
  {
    uuid: '1',
    title: 'Test Video 1',
    video_url: 'https://youtube.com/1',
    thumbnail_url: 'https://i.ytimg.com/vi/thumb1/maxresdefault.jpg',
    is_watched: false,
    channel_title: 'Tech Channel',
    channel_tags: [{ id: '1', name: 'Tech', color: '#3B82F6' }],
  },
  {
    uuid: '2',
    title: 'Test Video 2',
    video_url: 'https://youtube.com/2',
    thumbnail_url: 'https://i.ytimg.com/vi/thumb2/maxresdefault.jpg',
    is_watched: true,
    channel_title: 'Gaming Channel',
    channel_tags: [{ id: '2', name: 'Gaming', color: '#EF4444' }],
  },
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
        <VideoList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
      expect(screen.getByText('Test Video 2')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockFetchVideos.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <VideoList />
      </TestWrapper>
    );

    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('handles watch status toggle', async () => {
    mockUpdateVideoWatchStatus.mockResolvedValue({});
    
    render(
      <TestWrapper>
        <VideoList />
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