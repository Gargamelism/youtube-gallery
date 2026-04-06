import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';

// Mock hooks and services
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { first_name: 'Test', last_name: 'User', username: 'testuser', email: 'test@example.com' },
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

jest.mock('@/services', () => ({
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/config/routes', () => ({
  isProtectedRoute: jest.fn().mockReturnValue(true),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: jest.fn() }),
}));

jest.mock('@/lib/storage', () => ({
  storage: { clearAll: jest.fn() },
}));

const mockAddTag = jest.fn();
const mockUseVideoFilters = jest.fn(() => ({ addTag: mockAddTag }));
jest.mock('@/hooks/useVideoFilters', () => ({
  useVideoFilters: () => mockUseVideoFilters(),
}));

jest.mock('@/components/tags/mutations', () => ({
  useChannelTags: () => ({
    data: {
      results: [
        { id: '1', name: 'yoga', color: '#ff6b6b' },
        { id: '2', name: 'travel', color: '#4ecdc4' },
      ],
    },
  }),
}));

let mockPathname = '/videos';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => mockPathname,
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function renderSidebar() {
  return render(<Sidebar />);
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockPathname = '/videos';
    mockAddTag.mockClear();
  });

  it('renders in expanded state by default', () => {
    renderSidebar();
    const sidebar = document.querySelector('.Sidebar');
    expect(sidebar?.className).toMatch(/w-64/);
  });

  it('shows the logo text when expanded', () => {
    renderSidebar();
    expect(screen.getByText('NoGarithmTube')).toBeInTheDocument();
    expect(screen.getByText('Video Management')).toBeInTheDocument();
  });

  it('collapses when the chevron button is clicked', async () => {
    renderSidebar();
    const collapseBtn = document.querySelector('.Sidebar__collapse-btn') as HTMLButtonElement;
    fireEvent.click(collapseBtn);
    const sidebar = document.querySelector('.Sidebar');
    expect(sidebar?.className).toMatch(/w-16/);
  });

  it('expands again when chevron is clicked a second time', () => {
    renderSidebar();
    const collapseBtn = document.querySelector('.Sidebar__collapse-btn') as HTMLButtonElement;
    fireEvent.click(collapseBtn);
    fireEvent.click(collapseBtn);
    const sidebar = document.querySelector('.Sidebar');
    expect(sidebar?.className).toMatch(/w-64/);
  });

  it('persists collapsed state to localStorage', () => {
    renderSidebar();
    const collapseBtn = document.querySelector('.Sidebar__collapse-btn') as HTMLButtonElement;
    fireEvent.click(collapseBtn);
    expect(localStorageMock.getItem('sidebar_collapsed')).toBe('true');
  });

  it('restores collapsed state from localStorage on mount', () => {
    localStorageMock.setItem('sidebar_collapsed', 'true');
    renderSidebar();
    const sidebar = document.querySelector('.Sidebar');
    expect(sidebar?.className).toMatch(/w-16/);
  });

  it('shows navigation links for Videos and Channels', () => {
    renderSidebar();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Channels')).toBeInTheDocument();
  });

  it('renders tags in the sidebar when on /videos', () => {
    renderSidebar();
    expect(screen.getByText('yoga')).toBeInTheDocument();
    expect(screen.getByText('travel')).toBeInTheDocument();
  });

  it('calls addTag when a sidebar tag is clicked', () => {
    renderSidebar();
    fireEvent.click(screen.getByText('yoga').closest('button')!);
    expect(mockAddTag).toHaveBeenCalledWith('yoga');
  });

  it('does not show tags section when not on /videos', async () => {
    mockPathname = '/channels';
    renderSidebar();
    expect(screen.queryByText('yoga')).not.toBeInTheDocument();
  });

  it('shows the user avatar button', () => {
    renderSidebar();
    expect(document.querySelector('.Sidebar__avatar')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // first letter of "Test"
  });

  it('active Videos nav link has purple styling on /videos', () => {
    renderSidebar();
    const videosLink = screen.getByText('Videos').closest('button');
    expect(videosLink?.className).toMatch(/bg-purple-100/);
  });

  it('Channels nav link does not have active styling on /videos', () => {
    renderSidebar();
    const channelsLink = screen.getByText('Channels').closest('button');
    expect(channelsLink?.className).not.toMatch(/bg-purple-100/);
  });

  describe('user dropdown', () => {
    it('opens the user menu on avatar click', async () => {
      renderSidebar();
      const avatarBtn = document.querySelector('.Sidebar__user-button') as HTMLButtonElement;
      fireEvent.click(avatarBtn);
      await waitFor(() => {
        expect(screen.getByText('Sign out')).toBeInTheDocument();
      });
    });

    it('shows user email in the dropdown', async () => {
      renderSidebar();
      fireEvent.click(document.querySelector('.Sidebar__user-button') as HTMLButtonElement);
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });
  });
});
