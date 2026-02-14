import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChannelFilterBar } from '../ChannelFilterBar';
import { TagMode } from '@/types';

const mockTags = [
  { id: '1', name: 'Tech', color: '#3B82F6', description: '', channel_count: 5, created_at: '2023-01-01T00:00:00Z' },
  { id: '2', name: 'Gaming', color: '#EF4444', description: '', channel_count: 3, created_at: '2023-01-01T00:00:00Z' },
];

jest.mock('@/components/tags/mutations', () => ({
  useChannelTags: () => ({
    data: { results: mockTags },
    isLoading: false,
    error: null,
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('ChannelFilterBar', () => {
  const mockProps = {
    search: '',
    selectedTags: [],
    tagMode: TagMode.ANY,
    onSearchChange: jest.fn(),
    onTagsChange: jest.fn(),
    onTagModeChange: jest.fn(),
    onResetFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText('search.placeholder')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', async () => {
    jest.useFakeTimers();
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('search.placeholder');
    fireEvent.change(searchInput, { target: { value: 'tech' } });

    jest.advanceTimersByTime(600);

    expect(mockProps.onSearchChange).toHaveBeenCalledWith('tech');
    jest.useRealTimers();
  });

  it('displays current search value', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} search="programming" />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('search.placeholder') as HTMLInputElement;
    expect(searchInput.value).toBe('programming');
  });

  it('renders tag filter section when showTagFilter is true', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} showTagFilter={true} />
      </TestWrapper>
    );

    expect(screen.getByText('filterByTags')).toBeInTheDocument();
  });

  it('does not render tag filter section when showTagFilter is false', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} showTagFilter={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('filterByTags')).not.toBeInTheDocument();
  });

  it('shows tag mode toggle when multiple tags are selected', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={['Tech', 'Gaming']} showTagFilter={true} />
      </TestWrapper>
    );

    expect(screen.getByText('tagMode.any')).toBeInTheDocument();
    expect(screen.getByText('tagMode.all')).toBeInTheDocument();
  });

  it('does not show tag mode toggle when zero tags selected', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={[]} showTagFilter={true} />
      </TestWrapper>
    );

    expect(screen.queryByText('tagMode.any')).not.toBeInTheDocument();
    expect(screen.queryByText('tagMode.all')).not.toBeInTheDocument();
  });

  it('shows tag mode toggle when one tag selected', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={['Tech']} showTagFilter={true} />
      </TestWrapper>
    );

    expect(screen.getByText('tagMode.any')).toBeInTheDocument();
    expect(screen.getByText('tagMode.all')).toBeInTheDocument();
  });

  it('highlights ANY tag mode button when selected', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={['Tech', 'Gaming']} tagMode={TagMode.ANY} showTagFilter={true} />
      </TestWrapper>
    );

    const anyButton = screen.getByText('tagMode.any');
    expect(anyButton).toHaveClass('bg-blue-100');
    expect(anyButton).toHaveClass('text-blue-700');
  });

  it('highlights ALL tag mode button when selected', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={['Tech', 'Gaming']} tagMode={TagMode.ALL} showTagFilter={true} />
      </TestWrapper>
    );

    const allButton = screen.getByText('tagMode.all');
    expect(allButton).toHaveClass('bg-blue-100');
    expect(allButton).toHaveClass('text-blue-700');
  });

  it('calls onTagModeChange when clicking tag mode buttons', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={['Tech', 'Gaming']} tagMode={TagMode.ANY} showTagFilter={true} />
      </TestWrapper>
    );

    const allButton = screen.getByText('tagMode.all');
    fireEvent.click(allButton);

    expect(mockProps.onTagModeChange).toHaveBeenCalledWith(TagMode.ALL);
  });

  it('shows clear filters button when tags are selected', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} selectedTags={['Tech']} showTagFilter={true} />
      </TestWrapper>
    );

    expect(screen.getByText('clearAll')).toBeInTheDocument();
  });

  it('does not show clear filters button when no filters are active', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} search="" selectedTags={[]} showTagFilter={true} />
      </TestWrapper>
    );

    expect(screen.queryByText('clearAll')).not.toBeInTheDocument();
  });

  it('renders without tag filter for available channels', () => {
    render(
      <TestWrapper>
        <ChannelFilterBar {...mockProps} showTagFilter={false} />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText('search.placeholder')).toBeInTheDocument();
    expect(screen.queryByText('filterByTags')).not.toBeInTheDocument();
  });
});
