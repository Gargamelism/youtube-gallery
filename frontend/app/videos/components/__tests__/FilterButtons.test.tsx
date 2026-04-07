import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterButtons } from '../FilterButtons';
import { NotInterestedFilter, TagMode } from '@/types';

const mockUpdateDurationBounds = jest.fn();
const mockUpdateIsShort = jest.fn();
const mockUpdateNotInterestedFilter = jest.fn();
const mockUpdateTags = jest.fn();
const mockUpdateTagMode = jest.fn();
const mockUpdateSort = jest.fn();

const defaultFilters = {
  filter: 'unwatched',
  selectedTags: [] as string[],
  tagMode: TagMode.ANY,
  searchQuery: '',
  notInterestedFilter: NotInterestedFilter.EXCLUDE,
  sort: 'in_progress_first' as const,
  shorterThan: undefined as number | undefined,
  longerThan: undefined as number | undefined,
  isShort: undefined as boolean | undefined,
  updateFilter: jest.fn(),
  updateTags: mockUpdateTags,
  updateTagMode: mockUpdateTagMode,
  updateSearchQuery: jest.fn(),
  updateNotInterestedFilter: mockUpdateNotInterestedFilter,
  updateSort: mockUpdateSort,
  updateShorterThan: jest.fn(),
  updateLongerThan: jest.fn(),
  updateDurationBounds: mockUpdateDurationBounds,
  updateIsShort: mockUpdateIsShort,
  addTag: jest.fn(),
  removeTag: jest.fn(),
  areFiltersEqual: jest.fn(),
};

let mockFilters = { ...defaultFilters };

jest.mock('@/hooks/useVideoFilters', () => ({
  useVideoFilters: () => mockFilters,
}));

jest.mock('@/components/tags/mutations', () => ({
  useChannelTags: () => ({
    data: {
      results: [
        { id: '1', name: 'yoga', color: '#ff6b6b' },
        { id: '2', name: 'travel', color: '#4ecdc4' },
        { id: '3', name: 'music', color: '#45b7d1' },
      ],
    },
  }),
}));

jest.mock('../SortSelector', () => ({
  SortSelector: ({ sort, onSortChange }: { sort: string; onSortChange: (value: string) => void }) => (
    <select data-testid="sort-selector" value={sort} onChange={e => onSortChange(e.target.value)}>
      <option value="in_progress_first">In Progress First</option>
      <option value="newest">Newest</option>
    </select>
  ),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'durationFilter.shorterThan': 'Shorter than',
        'durationFilter.longerThan': 'Longer than',
        'durationFilter.minutesSuffix': 'min',
        'shortsFilter.hide': 'Hide Shorts',
        hideNotInterested: 'Hide dismissed',
        'tagFilters.label': 'Filters:',
        'tagFilters.addTag': 'Add tag',
        'tagFilters.clearAll': 'Clear all',
        'tagFilters.anyOfThese': 'Any of these tags',
        'tagFilters.allOfThese': 'All of these tags',
        'tagFilters.noneOfThese': 'None of these tags',
      };
      return map[key] ?? key;
    },
  }),
}));

function renderFilterButtons() {
  return render(<FilterButtons />);
}

describe('FilterButtons — Duration inputs', () => {
  beforeEach(() => {
    mockFilters = { ...defaultFilters };
    jest.clearAllMocks();
  });

  it('renders Shorter than and Longer than labels', () => {
    renderFilterButtons();
    expect(screen.getByText('Shorter than')).toBeInTheDocument();
    expect(screen.getByText('Longer than')).toBeInTheDocument();
  });

  it('shorter than input is empty when not set', () => {
    renderFilterButtons();
    const input = document.querySelector<HTMLInputElement>('.FilterButtons__shorter-than input');
    expect(input?.value).toBe('');
  });

  it('shorter than input shows value from filter state', () => {
    mockFilters = { ...defaultFilters, shorterThan: 15 };
    renderFilterButtons();
    const input = document.querySelector<HTMLInputElement>('.FilterButtons__shorter-than input');
    expect(input?.value).toBe('15');
  });

  it('changing shorter than input calls updateDurationBounds', () => {
    renderFilterButtons();
    const input = document.querySelector<HTMLInputElement>('.FilterButtons__shorter-than input')!;
    fireEvent.change(input, { target: { value: '10' } });
    expect(mockUpdateDurationBounds).toHaveBeenCalledWith(10, undefined);
  });

  it('changing longer than input calls updateDurationBounds', () => {
    renderFilterButtons();
    const input = document.querySelector<HTMLInputElement>('.FilterButtons__longer-than input')!;
    fireEvent.change(input, { target: { value: '5' } });
    expect(mockUpdateDurationBounds).toHaveBeenCalledWith(undefined, 5);
  });

  it('setting shorter than to 0 clears the value (undefined)', () => {
    mockFilters = { ...defaultFilters, shorterThan: 10 };
    renderFilterButtons();
    const input = document.querySelector<HTMLInputElement>('.FilterButtons__shorter-than input')!;
    fireEvent.change(input, { target: { value: '0' } });
    expect(mockUpdateDurationBounds).toHaveBeenCalledWith(undefined, undefined);
  });
});

describe('FilterButtons — Hide Shorts toggle', () => {
  beforeEach(() => {
    mockFilters = { ...defaultFilters };
    jest.clearAllMocks();
  });

  it('renders the Hide Shorts toggle switch', () => {
    renderFilterButtons();
    expect(screen.getByRole('switch', { name: /hide shorts/i })).toBeInTheDocument();
  });

  it('toggle is off when isShort is undefined', () => {
    renderFilterButtons();
    const toggle = screen.getByRole('switch', { name: /hide shorts/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('toggle is on when isShort is false', () => {
    mockFilters = { ...defaultFilters, isShort: false };
    renderFilterButtons();
    const toggle = screen.getByRole('switch', { name: /hide shorts/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking toggle when off calls updateIsShort(false)', () => {
    renderFilterButtons();
    fireEvent.click(screen.getByRole('switch', { name: /hide shorts/i }));
    expect(mockUpdateIsShort).toHaveBeenCalledWith(false);
  });

  it('clicking toggle when on calls updateIsShort(undefined)', () => {
    mockFilters = { ...defaultFilters, isShort: false };
    renderFilterButtons();
    fireEvent.click(screen.getByRole('switch', { name: /hide shorts/i }));
    expect(mockUpdateIsShort).toHaveBeenCalledWith(undefined);
  });
});

describe('FilterButtons — Hide Not Interested toggle', () => {
  beforeEach(() => {
    mockFilters = { ...defaultFilters };
    jest.clearAllMocks();
  });

  it('renders the Hide dismissed toggle', () => {
    renderFilterButtons();
    expect(screen.getByRole('switch', { name: /hide dismissed/i })).toBeInTheDocument();
  });

  it('toggle is on by default (EXCLUDE mode)', () => {
    renderFilterButtons();
    const toggle = screen.getByRole('switch', { name: /hide dismissed/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggle is off when notInterestedFilter is INCLUDE', () => {
    mockFilters = { ...defaultFilters, notInterestedFilter: NotInterestedFilter.INCLUDE };
    renderFilterButtons();
    expect(screen.getByRole('switch', { name: /hide dismissed/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking toggle when on calls updateNotInterestedFilter(INCLUDE)', () => {
    renderFilterButtons();
    fireEvent.click(screen.getByRole('switch', { name: /hide dismissed/i }));
    expect(mockUpdateNotInterestedFilter).toHaveBeenCalledWith(NotInterestedFilter.INCLUDE);
  });

  it('clicking toggle when off calls updateNotInterestedFilter(EXCLUDE)', () => {
    mockFilters = { ...defaultFilters, notInterestedFilter: NotInterestedFilter.INCLUDE };
    renderFilterButtons();
    fireEvent.click(screen.getByRole('switch', { name: /hide dismissed/i }));
    expect(mockUpdateNotInterestedFilter).toHaveBeenCalledWith(NotInterestedFilter.EXCLUDE);
  });
});

describe('FilterButtons — Tag filter pills', () => {
  beforeEach(() => {
    mockFilters = { ...defaultFilters };
    jest.clearAllMocks();
  });

  it('shows + Add tag button', () => {
    renderFilterButtons();
    expect(screen.getByText(/add tag/i)).toBeInTheDocument();
  });

  it('clicking + Add tag shows dropdown with available tags', () => {
    renderFilterButtons();
    fireEvent.click(screen.getByText(/add tag/i));
    expect(screen.getByText('yoga')).toBeInTheDocument();
    expect(screen.getByText('travel')).toBeInTheDocument();
  });

  it('clicking a tag in dropdown calls updateTags', () => {
    renderFilterButtons();
    fireEvent.click(screen.getByText(/add tag/i));
    fireEvent.click(screen.getByText('yoga').closest('.AddTagDropdown__item')!);
    expect(mockUpdateTags).toHaveBeenCalledWith(['yoga']);
  });

  it('does not show Clear all when no tags are selected', () => {
    renderFilterButtons();
    expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument();
  });

  it('shows Clear all when tags are selected', () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'] };
    renderFilterButtons();
    expect(screen.getByText(/clear all/i)).toBeInTheDocument();
  });

  it('clicking Clear all calls updateTags with empty array', () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'] };
    renderFilterButtons();
    fireEvent.click(screen.getByText(/clear all/i));
    expect(mockUpdateTags).toHaveBeenCalledWith([]);
  });

  it('does not render tag mode buttons when no tags selected', () => {
    renderFilterButtons();
    expect(screen.queryByText('Any of these tags')).not.toBeInTheDocument();
  });

  it('renders tag mode buttons when tags are selected', () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'] };
    renderFilterButtons();
    expect(screen.getByText('Any of these tags')).toBeInTheDocument();
    expect(screen.getByText('All of these tags')).toBeInTheDocument();
    expect(screen.getByText('None of these tags')).toBeInTheDocument();
  });

  it('active tag mode button has purple styling', () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'], tagMode: TagMode.ALL };
    renderFilterButtons();
    expect(screen.getByText('All of these tags').className).toMatch(/bg-purple-100/);
  });

  it('clicking All of these tags calls updateTagMode(ALL)', () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'] };
    renderFilterButtons();
    fireEvent.click(screen.getByText('All of these tags'));
    expect(mockUpdateTagMode).toHaveBeenCalledWith(TagMode.ALL);
  });

  it('clicking None of these tags calls updateTagMode(EXCEPT)', () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'] };
    renderFilterButtons();
    fireEvent.click(screen.getByText('None of these tags'));
    expect(mockUpdateTagMode).toHaveBeenCalledWith(TagMode.EXCEPT);
  });

  it('dropdown does not show already-selected tags', async () => {
    mockFilters = { ...defaultFilters, selectedTags: ['yoga'] };
    renderFilterButtons();
    fireEvent.click(screen.getByText(/add tag/i));
    // 'yoga' appears as a selected tag badge, but must not appear in the dropdown items
    await waitFor(() => {
      const menu = document.querySelector('.AddTagDropdown__menu');
      expect(menu).toBeInTheDocument();
      const itemTexts = Array.from(menu!.querySelectorAll('.AddTagDropdown__item')).map(el => el.textContent?.trim());
      expect(itemTexts).not.toContain('yoga');
    });
    expect(screen.getByText('travel')).toBeInTheDocument();
  });
});
