import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VideoList } from '../VideoList';
import { TagMode } from '@/types';

const mockVideos = [
  {
    uuid: '1',
    title: 'Test Video 1',
    video_url: 'https://youtube.com/1',
    thumbnail_url: 'thumb1.jpg',
    is_watched: false,
    channel_title: 'Tech Channel',
    channel_tags: [{ id: '1', name: 'Tech', color: '#3B82F6' }],
  },
  {
    uuid: '2',
    title: 'Test Video 2',
    video_url: 'https://youtube.com/2',
    thumbnail_url: 'thumb2.jpg',
    is_watched: true,
    channel_title: 'Gaming Channel',
    channel_tags: [{ id: '2', name: 'Gaming', color: '#EF4444' }],
  },
];

const mockFetchVideos = jest.fn();
const mockUpdateVideoWatchStatus = jest.fn();

jest.mock('@/services', () => ({
  fetchVideos: () => mockFetchVideos(),
  updateVideoWatchStatus: mockUpdateVideoWatchStatus,
}));

jest.mock('@/hooks/useVideoFilters', () => ({
  useVideoFilters: () => ({
    filter: 'all',
    selectedTags: [],
    tagMode: TagMode.ANY,
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('VideoList', () => {
  beforeEach(() => {
    mockFetchVideos.mockResolvedValue({
      data: { results: mockVideos },
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

    expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(6);
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

    const watchButton = screen.getAllByRole('button', { name: /watch/i })[0];
    fireEvent.click(watchButton);

    expect(mockUpdateVideoWatchStatus).toHaveBeenCalledWith('1', true);
  });

  it('opens video in new tab when clicked', async () => {
    const originalOpen = window.open;
    window.open = jest.fn();

    render(
      <TestWrapper>
        <VideoList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Video 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Video 1'));
    expect(window.open).toHaveBeenCalledWith('https://youtube.com/1', '_blank');

    window.open = originalOpen;
  });

  it('displays channel tags', async () => {
    render(
      <TestWrapper>
        <VideoList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Tech')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockFetchVideos.mockRejectedValue(new Error('Failed to fetch'));
    
    render(
      <TestWrapper>
        <VideoList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});