import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagManager } from '../TagManager';

const mockTags = [
  {
    id: '1',
    name: 'Tech',
    color: '#3B82F6',
    description: 'Technology videos',
    channel_count: 5,
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Gaming',
    color: '#EF4444',
    description: 'Gaming content',
    channel_count: 3,
    created_at: '2023-01-01T00:00:00Z',
  },
];

jest.mock('../mutations', () => ({
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

    expect(screen.getByText('tagManager')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <TagManager {...mockProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('tagManager')).not.toBeInTheDocument();
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

  it('shows delete confirmation', async () => {
    window.confirm = jest.fn(() => false);

    render(
      <TestWrapper>
        <TagManager {...mockProps} />
      </TestWrapper>
    );

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    const firstDeleteButton = deleteButtons[0];
    if (!firstDeleteButton) throw new Error('Delete button not found');

    fireEvent.click(firstDeleteButton);

    expect(window.confirm).toHaveBeenCalled();
  });
});
