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
        'durationFilter.shorterThan': 'Shorter than',
        'durationFilter.longerThan': 'Longer than',
        'durationFilter.minutesSuffix': 'min',
        'shortsFilter.all': 'All',
        'shortsFilter.only': 'Shorts only',
        'shortsFilter.hide': 'Hide Shorts',
      };
      return translations[key] ?? key;
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

describe('FilterButtons - Duration Inputs', () => {
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

  it('renders the duration section with border separator', () => {
    const { container } = render(<FilterButtons {...defaultProps} />);
    const durationSection = container.querySelector('.FilterButton__duration');
    expect(durationSection).toBeInTheDocument();
    expect(durationSection).toHaveClass('border-t');
    expect(durationSection).toHaveClass('pt-4');
  });

  it('renders "Shorter than" and "Longer than" inputs', () => {
    const { container } = render(<FilterButtons {...defaultProps} />);
    const shorterInput = container.querySelector('.FilterButton__shorter-than input');
    const longerInput = container.querySelector('.FilterButton__longer-than input');
    expect(shorterInput).toBeInTheDocument();
    expect(longerInput).toBeInTheDocument();
  });

  it('inputs are empty when no URL params are set', () => {
    const { container } = render(<FilterButtons {...defaultProps} />);
    const shorterInput = container.querySelector<HTMLInputElement>('.FilterButton__shorter-than input');
    const longerInput = container.querySelector<HTMLInputElement>('.FilterButton__longer-than input');
    expect(shorterInput?.value).toBe('');
    expect(longerInput?.value).toBe('');
  });

  it('populates shorter_than input from URL param', () => {
    mockSearchParamsString = 'shorter_than=10';
    const { container } = render(<FilterButtons {...defaultProps} />);
    const input = container.querySelector<HTMLInputElement>('.FilterButton__shorter-than input');
    expect(input?.value).toBe('10');
  });

  it('populates longer_than input from URL param', () => {
    mockSearchParamsString = 'longer_than=20';
    const { container } = render(<FilterButtons {...defaultProps} />);
    const input = container.querySelector<HTMLInputElement>('.FilterButton__longer-than input');
    expect(input?.value).toBe('20');
  });

  it('updates URL with shorter_than when input changes to positive value', async () => {
    const { container } = render(<FilterButtons {...defaultProps} />);
    const input = container.querySelector<HTMLInputElement>('.FilterButton__shorter-than input')!;

    fireEvent.change(input, { target: { value: '15' } });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('shorter_than=15'));
    });
  });

  it('updates URL with longer_than when input changes to positive value', async () => {
    const { container } = render(<FilterButtons {...defaultProps} />);
    const input = container.querySelector<HTMLInputElement>('.FilterButton__longer-than input')!;

    fireEvent.change(input, { target: { value: '30' } });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('longer_than=30'));
    });
  });

  it('clears shorter_than from URL when input is set to 0', async () => {
    mockSearchParamsString = 'shorter_than=10';
    const { container } = render(<FilterButtons {...defaultProps} />);
    const input = container.querySelector<HTMLInputElement>('.FilterButton__shorter-than input')!;

    fireEvent.change(input, { target: { value: '0' } });

    await waitFor(() => {
      const pushArg: string = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushArg).not.toContain('shorter_than');
    });
  });
});

describe('FilterButtons - Shorts Filter', () => {
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

  it('renders all three Shorts filter buttons', () => {
    const { container } = render(<FilterButtons {...defaultProps} />);

    const shortsSection = container.querySelector('.FilterButton__is-short');
    expect(shortsSection).not.toBeNull();
    expect(shortsSection?.textContent).toContain('All');
    expect(shortsSection?.textContent).toContain('Shorts only');
    expect(shortsSection?.textContent).toContain('Hide Shorts');
  });

  it('"All" Shorts button is active when isShort is undefined', () => {
    mockSearchParamsString = '';
    const { container } = render(<FilterButtons {...defaultProps} />);
    const shortsSection = container.querySelector('.FilterButton__is-short');
    const allBtn = shortsSection?.querySelector('[aria-selected="true"]');
    expect(allBtn?.textContent).toBe('All');
  });

  it('marks "Shorts only" as active when is_short=true in URL', () => {
    mockSearchParamsString = 'is_short=true';
    const { container } = render(<FilterButtons {...defaultProps} />);

    const shortsSection = container.querySelector('.FilterButton__is-short');
    const activeBtn = shortsSection?.querySelector('[aria-selected="true"]');
    expect(activeBtn?.textContent).toBe('Shorts only');
  });

  it('marks "Hide Shorts" as active when is_short=false in URL', () => {
    mockSearchParamsString = 'is_short=false';
    const { container } = render(<FilterButtons {...defaultProps} />);

    const shortsSection = container.querySelector('.FilterButton__is-short');
    const activeBtn = shortsSection?.querySelector('[aria-selected="true"]');
    expect(activeBtn?.textContent).toBe('Hide Shorts');
  });

  it('updates URL when "Shorts only" is clicked', async () => {
    render(<FilterButtons {...defaultProps} />);

    const shortsOnlyBtn = screen.getByRole('button', { name: /shorts only/i });
    fireEvent.click(shortsOnlyBtn);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('is_short=true'));
    });
  });

  it('updates URL when "Hide Shorts" is clicked', async () => {
    render(<FilterButtons {...defaultProps} />);

    const hideShortsBtn = screen.getByRole('button', { name: /hide shorts/i });
    fireEvent.click(hideShortsBtn);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('is_short=false'));
    });
  });

  it('clears is_short filter when active button is clicked again', async () => {
    mockSearchParamsString = 'is_short=true';
    render(<FilterButtons {...defaultProps} />);

    const shortsOnlyBtn = screen.getByRole('button', { name: /shorts only/i });
    fireEvent.click(shortsOnlyBtn);

    await waitFor(() => {
      const pushArg: string = (mockRouter.push as jest.Mock).mock.calls[0][0];
      expect(pushArg).not.toContain('is_short');
    });
  });
});
