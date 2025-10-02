import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TagSelector } from '../TagSelector';

const mockTag1 = { id: '1', name: 'Tech', color: '#3B82F6', description: '', channel_count: 5, created_at: '2023-01-01T00:00:00Z' };
const mockTag2 = { id: '2', name: 'Gaming', color: '#EF4444', description: '', channel_count: 3, created_at: '2023-01-01T00:00:00Z' };

const mockTags = [mockTag1, mockTag2];
const mockSelectedTags = [mockTag1];

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
  useAssignChannelTags: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
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

    const dropdownButton = document.querySelector('.TagSelector__dropdown-button');
    fireEvent.click(dropdownButton!);

    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('shows available tags when dropdown opens', () => {
    render(
      <TestWrapper>
        <TagSelector {...mockProps} />
      </TestWrapper>
    );

    const dropdownButton = document.querySelector('.TagSelector__dropdown-button');
    fireEvent.click(dropdownButton!);

    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });
});
