import { renderHook } from '@testing-library/react';
import { useChannelFilters } from '../useChannelFilters';
import { TagMode, ChannelType } from '@/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter: AppRouterInstance = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const mockPathname = '/channels';

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}));

let mockSearchParamsString = '';

describe('useChannelFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsString = '';
  });

  describe('subscribed channel filters', () => {
    it('parses subscribed filters from URL', () => {
      mockSearchParamsString = 'ss=tech&sts=programming,tutorial&stm=all&sp=2';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));

      expect(result.current.search).toBe('tech');
      expect(result.current.selectedTags).toEqual(['programming', 'tutorial']);
      expect(result.current.tagMode).toBe(TagMode.ALL);
      expect(result.current.page).toBe(2);
    });

    it('returns default values when URL params are missing', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));

      expect(result.current.search).toBe('');
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.tagMode).toBe(TagMode.ANY);
      expect(result.current.page).toBe(1);
    });

    it('updates search and resets page to 1', () => {
      mockSearchParamsString = 'ss=old&sp=5';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateSearch('new search');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=new+search');
    });

    it('updates tags and resets page to 1', () => {
      mockSearchParamsString = 'ss=test&sp=3';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateTags(['tag1', 'tag2']);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=test&sts=tag1%2Ctag2&stm=any');
    });

    it('updates tag mode and resets page to 1', () => {
      mockSearchParamsString = 'ss=test&sts=tag1,tag2&stm=any&sp=3';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateTagMode(TagMode.ALL);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=test&sts=tag1%2Ctag2&stm=all');
    });

    it('updates page without resetting other filters', () => {
      mockSearchParamsString = 'ss=test&sts=tag1&sp=1';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updatePage(3);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=test&sts=tag1&sp=3');
    });

    it('adds tag to existing tags', () => {
      mockSearchParamsString = 'ss=test&sts=tag1';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.addTag('tag2');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=test&sts=tag1%2Ctag2&stm=any');
    });

    it('does not add duplicate tag', () => {
      mockSearchParamsString = 'ss=test&sts=tag1,tag2';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.addTag('tag1');

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('removes tag from existing tags', () => {
      mockSearchParamsString = 'ss=test&sts=tag1,tag2,tag3&stm=all';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.removeTag('tag2');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=test&sts=tag1%2Ctag3&stm=all');
    });

    it('resets all filters to defaults', () => {
      mockSearchParamsString = 'ss=test&sts=tag1,tag2&stm=all&sp=5';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.resetFilters();

      expect(mockRouter.push).toHaveBeenCalledWith('/channels');
    });
  });

  describe('available channel filters', () => {
    it('parses available filters from URL', () => {
      mockSearchParamsString = 'as=python&ap=3';

      const { result } = renderHook(() => useChannelFilters(ChannelType.AVAILABLE));

      expect(result.current.search).toBe('python');
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.tagMode).toBe(TagMode.ANY);
      expect(result.current.page).toBe(3);
    });

    it('updates search with available prefix', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useChannelFilters(ChannelType.AVAILABLE));
      result.current.updateSearch('javascript');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?as=javascript');
    });

    it('updates page with available prefix', () => {
      mockSearchParamsString = 'as=test&ap=1';

      const { result } = renderHook(() => useChannelFilters(ChannelType.AVAILABLE));
      result.current.updatePage(2);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?as=test&ap=2');
    });

    it('handles tag filtering for available channels', () => {
      mockSearchParamsString = 'as=test';

      const { result } = renderHook(() => useChannelFilters(ChannelType.AVAILABLE));
      result.current.updateTags(['coding', 'beginner']);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?as=test&ats=coding%2Cbeginner&atm=any');
    });
  });

  describe('coexistence of subscribed and available filters', () => {
    it('subscribed filters do not interfere with available filters in URL', () => {
      mockSearchParamsString = 'ss=react&sts=js&sp=2&as=python&ap=3';

      const { result: subscribedResult } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      const { result: availableResult } = renderHook(() => useChannelFilters(ChannelType.AVAILABLE));

      expect(subscribedResult.current.search).toBe('react');
      expect(subscribedResult.current.selectedTags).toEqual(['js']);
      expect(subscribedResult.current.page).toBe(2);

      expect(availableResult.current.search).toBe('python');
      expect(availableResult.current.selectedTags).toEqual([]);
      expect(availableResult.current.page).toBe(3);
    });

    it('updating subscribed filters preserves available filters', () => {
      mockSearchParamsString = 'ss=react&sp=1&as=python&ap=2';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateSearch('vue');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=vue&as=python&ap=2');
    });

    it('updating available filters preserves subscribed filters', () => {
      mockSearchParamsString = 'ss=react&sp=1&as=python&ap=2';

      const { result } = renderHook(() => useChannelFilters(ChannelType.AVAILABLE));
      result.current.updatePage(3);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=react&sp=1&as=python&ap=3');
    });
  });

  describe('edge cases', () => {
    it('handles empty search correctly', () => {
      mockSearchParamsString = 'ss=test&sp=2';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateSearch('');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels');
    });

    it('handles single tag without tag mode', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateTags(['single-tag']);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?sts=single-tag');
    });

    it('includes tag mode when multiple tags are selected', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateTags(['tag1', 'tag2']);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?sts=tag1%2Ctag2&stm=any');
    });

    it('omits page parameter when page is 1', () => {
      mockSearchParamsString = 'ss=test&sp=5';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updatePage(1);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=test');
    });

    it('handles special characters in search', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateSearch('C++ & Java');

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?ss=C%2B%2B+%26+Java');
    });

    it('handles tags with special characters', () => {
      mockSearchParamsString = '';

      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));
      result.current.updateTags(['C++', 'C#']);

      expect(mockRouter.push).toHaveBeenCalledWith('/channels?sts=C%2B%2B%2CC%23&stm=any');
    });
  });

  describe('action methods', () => {
    it('provides all required action methods', () => {
      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));

      expect(typeof result.current.updateSearch).toBe('function');
      expect(typeof result.current.updateTags).toBe('function');
      expect(typeof result.current.updateTagMode).toBe('function');
      expect(typeof result.current.updatePage).toBe('function');
      expect(typeof result.current.addTag).toBe('function');
      expect(typeof result.current.removeTag).toBe('function');
      expect(typeof result.current.resetFilters).toBe('function');
    });

    it('provides all filter state properties', () => {
      const { result } = renderHook(() => useChannelFilters(ChannelType.SUBSCRIBED));

      expect(result.current).toHaveProperty('search');
      expect(result.current).toHaveProperty('selectedTags');
      expect(result.current).toHaveProperty('tagMode');
      expect(result.current).toHaveProperty('page');
    });
  });
});
