import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagFilter } from '../TagFilter';
import { TagMode } from '@/types';

const mockTags = [
  { id: '1', name: 'Tech', color: '#3B82F6', description: '', channel_count: 5, created_at: '2023-01-01T00:00:00Z' },
  { id: '2', name: 'Gaming', color: '#EF4444', description: '', channel_count: 3, created_at: '2023-01-01T00:00:00Z' },
];

jest.mock('../mutations', () => ({
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

describe('TagFilter', () => {
  const mockProps = {
    selectedTags: [],
    tagMode: TagMode.ANY,
    onTagsChange: jest.fn(),
    onTagModeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tag filter interface', () => {
    render(
      <TestWrapper>
        <TagFilter {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('filterByTags')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('handles tag selection', async () => {
    render(
      <TestWrapper>
        <TagFilter {...mockProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Tech'));
    
    await waitFor(() => {
      expect(mockProps.onTagsChange).toHaveBeenCalledWith(['Tech']);
    });
  });

  it('toggles tag mode between ANY and ALL', () => {
    render(
      <TestWrapper>
        <TagFilter {...mockProps} />
      </TestWrapper>
    );

    const toggleButton = screen.getByRole('button', { name: /any/i });
    fireEvent.click(toggleButton);
    
    expect(mockProps.onTagModeChange).toHaveBeenCalledWith(TagMode.ALL);
  });

  it('shows selected tags', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedTags: ['Tech'],
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithSelected} />
      </TestWrapper>
    );

    const selectedTag = screen.getByText('Tech');
    expect(selectedTag.closest('.tag-badge')).toHaveClass('selected');
  });

  it('clears all selected tags', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedTags: ['Tech', 'Gaming'],
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithSelected} />
      </TestWrapper>
    );

    const clearButton = screen.getByText('clearAll');
    fireEvent.click(clearButton);
    
    expect(mockProps.onTagsChange).toHaveBeenCalledWith([]);
  });
});