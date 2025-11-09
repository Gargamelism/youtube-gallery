import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterButtons } from '../FilterButtons';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter: AppRouterInstance = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const mockPathname = '/videos';

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        unwatched: 'Unwatched',
        watched: 'Watched',
        allVideos: 'All Videos',
        hideNotInterested: 'Hide dismissed',
        notInterested: 'Not Interested',
        includeNotInterested: 'Include dismissed',
      };
      const hasKey = Object.prototype.hasOwnProperty.call(translations, key);
      return hasKey ? translations[key] ?? key : key;
    },
  }),
}));

jest.mock('@/components/ui/SearchAndTagFilter', () => ({
  SearchAndTagFilter: () => <div data-testid="search-and-tag-filter">SearchAndTagFilter</div>,
}));

let mockSearchParamsString = '';

describe('FilterButtons - Not Interested Filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsString = '';
  });

  const defaultProps = {
    totalCount: 100,
    watchedCount: 30,
    unwatchedCount: 70,
    notInterestedCount: 15,
  };

  describe('Rendering', () => {
    it('renders all three not interested filter buttons', () => {
      render(<FilterButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /hide dismissed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /not interested/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /include dismissed/i })).toBeInTheDocument();
    });

    it('shows not interested count badge on ONLY filter', () => {
      render(<FilterButtons {...defaultProps} />);

      const notInterestedButton = screen.getByRole('button', { name: /not interested/i });
      expect(notInterestedButton).toHaveTextContent('15');
    });

    it('does not show count badge on EXCLUDE and INCLUDE filters', () => {
      render(<FilterButtons {...defaultProps} />);

      const hideButton = screen.getByRole('button', { name: /hide dismissed/i });
      const includeButton = screen.getByRole('button', { name: /include dismissed/i });

      expect(hideButton).not.toHaveTextContent('15');
      expect(includeButton).not.toHaveTextContent('15');
    });

    it('separates not interested filters with border', () => {
      const { container } = render(<FilterButtons {...defaultProps} />);

      const notInterestedSection = container.querySelector('.FilterButton__not-interested');
      expect(notInterestedSection).toHaveClass('border-t');
      expect(notInterestedSection).toHaveClass('pt-4');
    });
  });

  describe('Filter selection', () => {
    it('marks EXCLUDE filter as active by default', () => {
      mockSearchParamsString = '';
      render(<FilterButtons {...defaultProps} />);

      const hideButton = screen.getByRole('button', { name: /hide dismissed/i });
      expect(hideButton).toHaveAttribute('aria-selected', 'true');
    });

    it('marks ONLY filter as active when selected', () => {
      mockSearchParamsString = 'not_interested_filter=only';
      render(<FilterButtons {...defaultProps} />);

      const onlyButton = screen.getByRole('button', { name: /not interested/i });
      expect(onlyButton).toHaveAttribute('aria-selected', 'true');
    });

    it('marks INCLUDE filter as active when selected', () => {
      mockSearchParamsString = 'not_interested_filter=include';
      render(<FilterButtons {...defaultProps} />);

      const includeButton = screen.getByRole('button', { name: /include dismissed/i });
      expect(includeButton).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Filter interactions', () => {
    it('updates URL when ONLY filter is clicked', async () => {
      render(<FilterButtons {...defaultProps} />);

      const onlyButton = screen.getByRole('button', { name: /not interested/i });
      fireEvent.click(onlyButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('not_interested_filter=only'));
      });
    });

    it('updates URL when INCLUDE filter is clicked', async () => {
      render(<FilterButtons {...defaultProps} />);

      const includeButton = screen.getByRole('button', { name: /include dismissed/i });
      fireEvent.click(includeButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('not_interested_filter=include'));
      });
    });

    it('updates URL when EXCLUDE filter is clicked', async () => {
      mockSearchParamsString = 'not_interested_filter=only';
      render(<FilterButtons {...defaultProps} />);

      const hideButton = screen.getByRole('button', { name: /hide dismissed/i });
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('not_interested_filter=exclude'));
      });
    });
  });

  describe('Styling', () => {
    it('applies red theme to active not interested filter', () => {
      mockSearchParamsString = 'not_interested_filter=only';
      render(<FilterButtons {...defaultProps} />);

      const onlyButton = screen.getByRole('button', { name: /not interested/i });
      expect(onlyButton).toHaveClass('aria-selected:bg-red-100');
      expect(onlyButton).toHaveClass('aria-selected:text-red-700');
    });

    it('applies gray theme to inactive not interested filters', () => {
      mockSearchParamsString = 'not_interested_filter=exclude';
      render(<FilterButtons {...defaultProps} />);

      const onlyButton = screen.getByRole('button', { name: /not interested/i });
      expect(onlyButton).toHaveClass('bg-gray-100');
      expect(onlyButton).toHaveClass('text-gray-800');
    });
  });

  describe('Filter interactions', () => {
    it('calls router.push when watch status filter clicked', async () => {
      render(<FilterButtons {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const watchedButton = buttons.find(
        btn => btn.textContent?.includes('Watched') && btn.textContent?.includes('30')
      );
      expect(watchedButton).toBeDefined();

      fireEvent.click(watchedButton!);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });

    it('calls router.push when not interested filter clicked', async () => {
      render(<FilterButtons {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const onlyButton = buttons.find(
        btn => btn.textContent?.includes('Not Interested') && btn.textContent?.includes('15')
      );
      expect(onlyButton).toBeDefined();

      fireEvent.click(onlyButton!);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalled();
      });
    });
  });

  describe('Count display', () => {
    it('shows zero count correctly', () => {
      render(<FilterButtons {...defaultProps} notInterestedCount={0} />);

      const onlyButton = screen.getByRole('button', { name: /not interested/i });
      expect(onlyButton).not.toHaveTextContent('0');
    });

    it('shows large counts correctly', () => {
      render(<FilterButtons {...defaultProps} notInterestedCount={999} />);

      const onlyButton = screen.getByRole('button', { name: /not interested/i });
      expect(onlyButton).toHaveTextContent('999');
    });
  });
});
