import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagSelector } from '../TagSelector';

const mockTags = [
  { id: '1', name: 'Tech', color: '#3B82F6', description: '', channel_count: 5, created_at: '2023-01-01T00:00:00Z' },
  { id: '2', name: 'Gaming', color: '#EF4444', description: '', channel_count: 3, created_at: '2023-01-01T00:00:00Z' },
];

const mockSelectedTags = [mockTags[0]];

const mockMutations = {
  useChannelTags: () => ({
    data: { results: mockTags },
    isLoading: false,
    error: null,
  }),
  useCreateChannelTag: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
};

jest.mock('../mutations', () => mockMutations);

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('TagSelector', () => {
  const mockProps = {
    channelId: 'channel-1',
    selectedTags: mockSelectedTags,
    onTagsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders selected tags', () => {
    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    const dropdownButton = screen.getByRole('button');
    fireEvent.click(dropdownButton);
    
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('filters tags by search input', async () => {
    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    const dropdownButton = screen.getByRole('button');
    fireEvent.click(dropdownButton);
    
    const searchInput = screen.getByPlaceholderText('searchTags');
    fireEvent.change(searchInput, { target: { value: 'Gam' } });
    
    await waitFor(() => {
      expect(screen.getByText('Gaming')).toBeInTheDocument();
      expect(screen.queryByText('Tech')).not.toBeInTheDocument();
    });
  });

  it('adds tag when clicked', () => {
    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    const dropdownButton = screen.getByRole('button');
    fireEvent.click(dropdownButton);
    
    fireEvent.click(screen.getByText('Gaming'));
    
    expect(mockProps.onTagsChange).toHaveBeenCalledWith([
      ...mockSelectedTags,
      mockTags[1],
    ]);
  });

  it('removes tag when clicked if already selected', () => {
    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    const dropdownButton = screen.getByRole('button');
    fireEvent.click(dropdownButton);
    
    fireEvent.click(screen.getByText('Tech'));
    
    expect(mockProps.onTagsChange).toHaveBeenCalledWith([]);
  });

  it('creates new tag when Enter is pressed', async () => {
    const createMutate = jest.fn();
    mockMutations.useCreateChannelTag = () => ({
      mutate: createMutate,
      isPending: false,
    });

    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    const dropdownButton = screen.getByRole('button');
    fireEvent.click(dropdownButton);
    
    const searchInput = screen.getByPlaceholderText('searchTags');
    fireEvent.change(searchInput, { target: { value: 'New Tag' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        name: 'New Tag',
        color: expect.any(String),
        description: '',
      });
    });
  });
});