import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, DefaultOptions } from '@tanstack/react-query';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ChannelSubscriptions from '../ChannelSubscriptions';
import * as services from '@/services';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/services', () => ({
  fetchUserChannels: jest.fn(),
  fetchAvailableChannels: jest.fn(),
  fetchUserQuotaUsage: jest.fn(),
  subscribeToChannel: jest.fn(),
  unsubscribeFromChannel: jest.fn(),
}));

const createMockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams(params);
  return {
    get: (key: string) => searchParams.get(key),
    toString: () => searchParams.toString(),
  };
};

const mockUserChannelsResponse = {
  data: {
    count: 12,
    next: null,
    previous: null,
    results: [
      {
        id: '1',
        channel: 'channel-1',
        channel_id: 'UC123',
        channel_title: 'Tech Channel',
        is_active: true,
        subscribed_at: '2024-01-01T00:00:00Z',
        tags: [{ id: 'tag-1', name: 'Tech', color: '#3B82F6' }],
      },
      {
        id: '2',
        channel: 'channel-2',
        channel_id: 'UC456',
        channel_title: 'Gaming Channel',
        is_active: true,
        subscribed_at: '2024-01-02T00:00:00Z',
        tags: [{ id: 'tag-2', name: 'Gaming', color: '#EF4444' }],
      },
    ],
  },
};

const mockAvailableChannelsResponse = {
  data: {
    count: 5,
    next: null,
    previous: null,
    results: [
      {
        uuid: 'channel-3',
        channel_id: 'UC789',
        title: 'Cooking Channel',
        description: 'Cooking tutorials',
        is_available: true,
        is_deleted: false,
        total_videos: 150,
      },
    ],
  },
};

const mockQuotaResponse = {
  data: {
    daily_quota_limit: 10000,
    quota_used_today: 1500,
    quota_remaining: 8500,
    percentage_used: 15,
    reset_time: '2024-01-02T00:00:00Z',
  },
};

const sharedQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
    mutations: { retry: false },
  } as DefaultOptions,
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <QueryClientProvider client={sharedQueryClient}>{children}</QueryClientProvider>;
};

const setupDefaultMocks = () => {
  (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn() });
  (usePathname as jest.Mock).mockReturnValue('/channels');
  (useSearchParams as jest.Mock).mockReturnValue(createMockSearchParams());
  (services.fetchUserChannels as jest.Mock).mockResolvedValue(mockUserChannelsResponse);
  (services.fetchAvailableChannels as jest.Mock).mockResolvedValue(mockAvailableChannelsResponse);
  (services.fetchUserQuotaUsage as jest.Mock).mockResolvedValue(mockQuotaResponse);
};

describe('ChannelSubscriptions', () => {
  beforeAll(() => {
    setupDefaultMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sharedQueryClient.clear();
    setupDefaultMocks();
  });

  describe('Core Functionality & Rendering', () => {
    it('renders channel data and filter bars', async () => {
      const { container } = render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Tech Channel')).toBeInTheDocument();
        expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
      });

      expect(container.querySelectorAll('.ChannelSubscriptions__card')).toHaveLength(2);

      const subscribedSection = container.querySelector('.ChannelSubscriptions__subscribed-section');
      const availableSection = container.querySelector('.ChannelSubscriptions__available-section');
      expect(subscribedSection?.querySelector('.ChannelFilterBar')).toBeInTheDocument();
      expect(availableSection?.querySelector('.ChannelFilterBar')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('displays skeleton loaders with correct counts and accessibility', () => {
      (services.fetchUserChannels as jest.Mock).mockReturnValue(new Promise(() => {}));
      (services.fetchAvailableChannels as jest.Mock).mockReturnValue(new Promise(() => {}));

      const { container } = render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      const subscribedLoading = screen.getByLabelText('loading.subscribed');
      const availableLoading = screen.getByLabelText('loading.available');

      expect(subscribedLoading).toBeInTheDocument();
      expect(availableLoading).toBeInTheDocument();

      expect(subscribedLoading).toHaveAttribute('aria-live', 'polite');
      expect(subscribedLoading).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');

      const subscribedSection = container.querySelector('.ChannelSubscriptions__subscribed-section');
      const availableSection = container.querySelector('.ChannelSubscriptions__available-section');

      expect(subscribedSection?.querySelectorAll('[role="status"][aria-label="Loading channel"]')).toHaveLength(6);
      expect(availableSection?.querySelectorAll('[role="status"][aria-label="Loading channel"]')).toHaveLength(21);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('shows proper empty state messages with accessibility', async () => {
      (services.fetchUserChannels as jest.Mock).mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      const { container } = render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/noSubscriptionsYet/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/noSubscriptionsDescription/i)).toBeInTheDocument();

      const emptyState = container.querySelector('.ChannelSubscriptions__empty');
      expect(emptyState).toHaveAttribute('role', 'status');

      const icon = container.querySelector('.ChannelSubscriptions__empty-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows filtered empty state and available channels empty state', async () => {
      (useSearchParams as jest.Mock).mockReturnValue(createMockSearchParams({ ss: 'nonexistent' }));
      (services.fetchUserChannels as jest.Mock).mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });
      (services.fetchAvailableChannels as jest.Mock).mockResolvedValue({
        data: { count: 0, next: null, previous: null, results: [] },
      });

      const { container } = render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/search\.noResults/i).length).toBeGreaterThanOrEqual(1);
      });

      const availableSection = container.querySelector('.ChannelSubscriptions__available-section');
      expect(availableSection?.querySelector('.ChannelSubscriptions__empty')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows pagination when multiple pages exist', async () => {
      (services.fetchUserChannels as jest.Mock).mockResolvedValue({
        data: {
          count: 18,
          next: 'http://api/channels?page=2',
          previous: null,
          results: mockUserChannelsResponse.data.results,
        },
      });

      const { container } = render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(container.querySelector('.subscribedPagination')).toBeInTheDocument();
      });
    });

    it('hides pagination when only one page', async () => {
      (services.fetchUserChannels as jest.Mock).mockResolvedValue({
        data: { count: 3, next: null, previous: null, results: mockUserChannelsResponse.data.results.slice(0, 3) },
      });

      const { container } = render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(container.querySelectorAll('[class*="Pagination"]')).toHaveLength(0);
      });
    });
  });

  describe('Filtering', () => {
    it('passes search filter to API', async () => {
      (useSearchParams as jest.Mock).mockReturnValue(createMockSearchParams({ ss: 'tech' }));

      render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(services.fetchUserChannels).toHaveBeenCalledWith(expect.objectContaining({ search: 'tech' }));
      });
    });

    it('passes tag filter to API', async () => {
      (useSearchParams as jest.Mock).mockReturnValue(createMockSearchParams({ sts: 'Tech,Gaming' }));

      render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(services.fetchUserChannels).toHaveBeenCalledWith(
          expect.objectContaining({ selectedTags: ['Tech', 'Gaming'] })
        );
      });
    });

    it('maintains separate filter state for subscribed and available channels', async () => {
      (useSearchParams as jest.Mock).mockReturnValue(createMockSearchParams({ ss: 'tech', sp: '2', as: 'cooking' }));

      render(
        <TestWrapper>
          <ChannelSubscriptions />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(services.fetchUserChannels).toHaveBeenCalledWith(expect.objectContaining({ search: 'tech', page: 2 }));
        expect(services.fetchAvailableChannels).toHaveBeenCalledWith(expect.objectContaining({ search: 'cooking' }));
      });
    });
  });
});
