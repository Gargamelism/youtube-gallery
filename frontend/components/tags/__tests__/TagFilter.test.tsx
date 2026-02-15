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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

    // Expand the filter to see available tags
    fireEvent.click(screen.getByText('filterByTags'));
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('handles tag selection', async () => {
    render(
      <TestWrapper>
        <TagFilter {...mockProps} />
      </TestWrapper>
    );

    // Expand the filter first
    fireEvent.click(screen.getByText('filterByTags'));
    fireEvent.click(screen.getByText('Tech'));

    await waitFor(() => {
      expect(mockProps.onTagsChange).toHaveBeenCalledWith(['Tech']);
    });
  });

  it('clicking ANY button sets mode to ANY', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedTags: ['Tech', 'Gaming'],
      tagMode: TagMode.ALL,
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithSelected} />
      </TestWrapper>
    );

    const anyButton = screen.getByText('tagMode.any');
    fireEvent.click(anyButton);

    expect(mockProps.onTagModeChange).toHaveBeenCalledWith(TagMode.ANY);
  });

  it('clicking ALL button sets mode to ALL', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedTags: ['Tech', 'Gaming'],
      tagMode: TagMode.ANY,
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithSelected} />
      </TestWrapper>
    );

    const allButton = screen.getByText('tagMode.all');
    fireEvent.click(allButton);

    expect(mockProps.onTagModeChange).toHaveBeenCalledWith(TagMode.ALL);
  });

  it('clicking EXCEPT button sets mode to EXCEPT', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedTags: ['Tech', 'Gaming'],
      tagMode: TagMode.ANY,
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithSelected} />
      </TestWrapper>
    );

    const exceptButton = screen.getByText('tagMode.except');
    fireEvent.click(exceptButton);

    expect(mockProps.onTagModeChange).toHaveBeenCalledWith(TagMode.EXCEPT);
  });

  it('shows mode toggle with single selected tag', () => {
    const propsWithSingleTag = {
      ...mockProps,
      selectedTags: ['Tech'],
      tagMode: TagMode.ANY,
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithSingleTag} />
      </TestWrapper>
    );

    expect(screen.getByText('tagMode.any')).toBeInTheDocument();
    expect(screen.getByText('tagMode.all')).toBeInTheDocument();
    expect(screen.getByText('tagMode.except')).toBeInTheDocument();
  });

  it('shows EXCEPT mode button with active styling when selected', () => {
    const propsWithExcept = {
      ...mockProps,
      selectedTags: ['Tech', 'Gaming'],
      tagMode: TagMode.EXCEPT,
    };

    render(
      <TestWrapper>
        <TagFilter {...propsWithExcept} />
      </TestWrapper>
    );

    expect(screen.getByText('tagMode.except')).toBeInTheDocument();
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
    expect(selectedTag).toBeInTheDocument();
    expect(selectedTag.closest('.TagBadge')).toBeInTheDocument();
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
