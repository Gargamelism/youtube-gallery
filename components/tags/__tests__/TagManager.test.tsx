import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagManager } from '../TagManager';

const mockTags = [
  { id: '1', name: 'Tech', color: '#3B82F6', description: 'Technology videos', channel_count: 5, created_at: '2023-01-01T00:00:00Z' },
  { id: '2', name: 'Gaming', color: '#EF4444', description: 'Gaming content', channel_count: 3, created_at: '2023-01-01T00:00:00Z' },
];

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
  useUpdateChannelTag: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useDeleteChannelTag: () => ({
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

describe('TagManager', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onTagsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <TestWrapper>
        <TagManager {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('manageTags')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <TagManager {...mockProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('manageTags')).not.toBeInTheDocument();
  });

  it('closes when clicking close button', () => {
    render(
      <TestWrapper>
        <TagManager {...mockProps} />
      </TestWrapper>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows create tag form', () => {
    render(
      <TestWrapper>
        <TagManager {...mockProps} />
      </TestWrapper>
    );

    const createButton = screen.getByText('createTag');
    fireEvent.click(createButton);
    
    expect(screen.getByPlaceholderText('tagName')).toBeInTheDocument();
    expect(screen.getByText('tagColor')).toBeInTheDocument();
  });

  it('creates new tag', async () => {
    const createMutate = jest.fn();
    mockMutations.useCreateChannelTag = () => ({
      mutate: createMutate,
      isPending: false,
    });

    render(
      <TestWrapper>
        <TagManager {...mockProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('createTag'));
    
    const nameInput = screen.getByPlaceholderText('tagName');
    fireEvent.change(nameInput, { target: { value: 'New Tag' } });
    
    const saveButton = screen.getByText('save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith({
        name: 'New Tag',
        color: expect.any(String),
        description: '',
      });
    });
  });

  it('deletes tag with confirmation', async () => {
    const deleteMutate = jest.fn();
    mockMutations.useDeleteChannelTag = () => ({
      mutate: deleteMutate,
      isPending: false,
    });

    window.confirm = jest.fn(() => true);

    render(
      <TestWrapper>
        <TagManager {...mockProps} />
      </TestWrapper>
    );

    const deleteButtons = screen.getAllByText('delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(deleteMutate).toHaveBeenCalledWith('1');
    });
  });
});