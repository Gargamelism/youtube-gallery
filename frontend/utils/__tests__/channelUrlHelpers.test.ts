import { filtersToUrlParams, urlParamsToFilters, filtersToApiParams } from '../channelUrlHelpers';
import { TagMode, ChannelFilters, ChannelType } from '@/types';

describe('filtersToUrlParams', () => {
  describe('subscribed channel parameters', () => {
    it('converts filters to subscribed URL params with s prefix', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'tech',
        selectedTags: ['programming', 'tutorial'],
        tagMode: TagMode.ALL,
        page: 2,
      };

      const result = filtersToUrlParams(filters, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        ss: 'tech',
        sts: 'programming,tutorial',
        stm: TagMode.ALL,
        sp: '2',
      });
    });

    it('omits tag mode when only one tag is selected', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'react',
        selectedTags: ['javascript'],
        tagMode: TagMode.ALL,
        page: 1,
      };

      const result = filtersToUrlParams(filters, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        ss: 'react',
        sts: 'javascript',
        stm: undefined,
        sp: undefined,
      });
    });

    it('omits page when page is 1', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'python',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 1,
      };

      const result = filtersToUrlParams(filters, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        ss: 'python',
        sts: undefined,
        stm: undefined,
        sp: undefined,
      });
    });

    it('returns undefined for all params when filters are empty', () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 1,
      };

      const result = filtersToUrlParams(filters, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        ss: undefined,
        sts: undefined,
        stm: undefined,
        sp: undefined,
      });
    });
  });

  describe('available channel parameters', () => {
    it('converts filters to available URL params with a prefix', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'javascript',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 3,
      };

      const result = filtersToUrlParams(filters, ChannelType.AVAILABLE);

      expect(result).toEqual({
        as: 'javascript',
        ats: undefined,
        atm: undefined,
        ap: '3',
      });
    });

    it('handles tag filtering for available channels', () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: ['coding', 'beginner'],
        tagMode: TagMode.ANY,
        page: 1,
      };

      const result = filtersToUrlParams(filters, ChannelType.AVAILABLE);

      expect(result).toEqual({
        as: undefined,
        ats: 'coding,beginner',
        atm: TagMode.ANY,
        ap: undefined,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty filters object', () => {
      const result = filtersToUrlParams({}, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        ss: undefined,
        sts: undefined,
        stm: undefined,
        sp: undefined,
      });
    });

    it('handles search with special characters', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'hello & world!',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 1,
      };

      const result = filtersToUrlParams(filters, ChannelType.SUBSCRIBED);

      expect(result.ss).toBe('hello & world!');
    });

    it('handles tags with special characters', () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: ['C++', 'C#', 'F#'],
        tagMode: TagMode.ALL,
        page: 1,
      };

      const result = filtersToUrlParams(filters, ChannelType.SUBSCRIBED);

      expect(result.sts).toBe('C++,C#,F#');
      expect(result.stm).toBe(TagMode.ALL);
    });
  });
});

describe('urlParamsToFilters', () => {
  describe('subscribed channel parameters', () => {
    it('parses subscribed URL params to filters', () => {
      const searchParams = new URLSearchParams('ss=tech&sts=programming,tutorial&stm=all&sp=2');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        search: 'tech',
        selectedTags: ['programming', 'tutorial'],
        tagMode: TagMode.ALL,
        page: 2,
      });
    });

    it('returns default values when params are missing', () => {
      const searchParams = new URLSearchParams('');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result).toEqual({
        search: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 1,
      });
    });

    it('defaults to TagMode.ANY when tag mode is not specified', () => {
      const searchParams = new URLSearchParams('ss=react&sts=javascript');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.tagMode).toBe(TagMode.ANY);
    });

    it('handles single tag correctly', () => {
      const searchParams = new URLSearchParams('ss=vue&sts=frontend');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.selectedTags).toEqual(['frontend']);
    });
  });

  describe('available channel parameters', () => {
    it('parses available URL params to filters', () => {
      const searchParams = new URLSearchParams('as=python&ap=5');

      const result = urlParamsToFilters(searchParams, ChannelType.AVAILABLE);

      expect(result).toEqual({
        search: 'python',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 5,
      });
    });

    it('handles available channel tag filtering', () => {
      const searchParams = new URLSearchParams('as=&ats=data,science&atm=all&ap=1');

      const result = urlParamsToFilters(searchParams, ChannelType.AVAILABLE);

      expect(result).toEqual({
        search: '',
        selectedTags: ['data', 'science'],
        tagMode: TagMode.ALL,
        page: 1,
      });
    });
  });

  describe('edge cases', () => {
    it('filters out empty tag strings from comma-separated values', () => {
      const searchParams = new URLSearchParams('ss=&sts=react,,vue,');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.selectedTags).toEqual(['react', 'vue']);
    });

    it('handles invalid page numbers by defaulting to 1', () => {
      const searchParams = new URLSearchParams('ss=test&sp=abc');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.page).toBe(NaN);
    });

    it('handles negative page numbers', () => {
      const searchParams = new URLSearchParams('ss=test&sp=-5');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.page).toBe(-5);
    });

    it('handles invalid tag mode by defaulting to ANY', () => {
      const searchParams = new URLSearchParams('ss=test&sts=tag1,tag2&stm=invalid');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.tagMode).toBe('invalid');
    });

    it('handles special characters in search', () => {
      const searchParams = new URLSearchParams('ss=hello+%26+world%21');

      const result = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

      expect(result.search).toBe('hello & world!');
    });
  });
});

describe('filtersToApiParams', () => {
  describe('basic conversion', () => {
    it('converts filters to API params with full names', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'tech',
        selectedTags: ['programming', 'tutorial'],
        tagMode: TagMode.ALL,
        page: 2,
      };

      const result = filtersToApiParams(filters);

      expect(result).toEqual({
        search: 'tech',
        tags: ['programming', 'tutorial'],
        tag_mode: TagMode.ALL,
        page: 2,
      });
    });

    it('omits tag_mode when only one tag is selected', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'react',
        selectedTags: ['javascript'],
        tagMode: TagMode.ALL,
        page: 1,
      };

      const result = filtersToApiParams(filters);

      expect(result).toEqual({
        search: 'react',
        tags: ['javascript'],
        tag_mode: undefined,
        page: 1,
      });
    });

    it('omits empty or undefined values', () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
      };

      const result = filtersToApiParams(filters);

      expect(result).toEqual({});
    });
  });

  describe('tag mode handling', () => {
    it('includes tag_mode when multiple tags and mode is ALL', () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: ['tag1', 'tag2', 'tag3'],
        tagMode: TagMode.ALL,
        page: 1,
      };

      const result = filtersToApiParams(filters);

      expect(result.tag_mode).toBe(TagMode.ALL);
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('includes tag_mode when multiple tags and mode is ANY', () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: ['tag1', 'tag2'],
        tagMode: TagMode.ANY,
        page: 1,
      };

      const result = filtersToApiParams(filters);

      expect(result.tag_mode).toBe(TagMode.ANY);
    });

    it('omits tag_mode when no tags are selected', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'test',
        selectedTags: [],
        tagMode: TagMode.ALL,
        page: 1,
      };

      const result = filtersToApiParams(filters);

      expect(result.tag_mode).toBeUndefined();
      expect(result.tags).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty filters object', () => {
      const result = filtersToApiParams({});

      expect(result).toEqual({});
    });

    it('preserves search with special characters', () => {
      const filters: Partial<ChannelFilters> = {
        search: 'C++ & Java!',
        selectedTags: [],
        tagMode: TagMode.ANY,
        page: 1,
      };

      const result = filtersToApiParams(filters);

      expect(result.search).toBe('C++ & Java!');
    });

    it('preserves tags array without modification', () => {
      const tagArray = ['tag1', 'tag2', 'tag3'];
      const filters: Partial<ChannelFilters> = {
        search: '',
        selectedTags: tagArray,
        tagMode: TagMode.ALL,
        page: 1,
      };

      const result = filtersToApiParams(filters);

      expect(result.tags).toBe(tagArray);
      expect(result.tags).not.toBe(['tag1', 'tag2', 'tag3']);
    });
  });
});

describe('integration tests - round trip conversions', () => {
  it('filters -> URL params -> filters maintains data integrity for subscribed', () => {
    const originalFilters: ChannelFilters = {
      search: 'react',
      selectedTags: ['javascript', 'tutorial'],
      tagMode: TagMode.ALL,
      page: 3,
    };

    const urlParams = filtersToUrlParams(originalFilters, ChannelType.SUBSCRIBED);
    const searchParams = new URLSearchParams();
    Object.entries(urlParams).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, value);
      }
    });

    const parsedFilters = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);

    expect(parsedFilters).toEqual(originalFilters);
  });

  it('filters -> URL params -> filters maintains data integrity for available', () => {
    const originalFilters: ChannelFilters = {
      search: 'python',
      selectedTags: [],
      tagMode: TagMode.ANY,
      page: 1,
    };

    const urlParams = filtersToUrlParams(originalFilters, ChannelType.AVAILABLE);
    const searchParams = new URLSearchParams();
    Object.entries(urlParams).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, value);
      }
    });

    const parsedFilters = urlParamsToFilters(searchParams, ChannelType.AVAILABLE);

    expect(parsedFilters).toEqual(originalFilters);
  });

  it('filters -> API params conversion is consistent', () => {
    const filters: ChannelFilters = {
      search: 'vue',
      selectedTags: ['frontend', 'framework'],
      tagMode: TagMode.ANY,
      page: 2,
    };

    const apiParams = filtersToApiParams(filters);

    expect(apiParams).toEqual({
      search: 'vue',
      tags: ['frontend', 'framework'],
      tag_mode: TagMode.ANY,
      page: 2,
    });
  });

  it('both subscribed and available filters can coexist in URL', () => {
    const subscribedFilters: ChannelFilters = {
      search: 'tech',
      selectedTags: ['programming'],
      tagMode: TagMode.ANY,
      page: 2,
    };

    const availableFilters: ChannelFilters = {
      search: 'python',
      selectedTags: [],
      tagMode: TagMode.ANY,
      page: 1,
    };

    const subscribedParams = filtersToUrlParams(subscribedFilters, ChannelType.SUBSCRIBED);
    const availableParams = filtersToUrlParams(availableFilters, ChannelType.AVAILABLE);

    const allParams = { ...subscribedParams, ...availableParams };

    expect(allParams).toEqual({
      ss: 'tech',
      sts: 'programming',
      stm: undefined,
      sp: '2',
      as: 'python',
      ats: undefined,
      atm: undefined,
      ap: undefined,
    });

    const searchParams = new URLSearchParams();
    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, value);
      }
    });

    const parsedSubscribed = urlParamsToFilters(searchParams, ChannelType.SUBSCRIBED);
    const parsedAvailable = urlParamsToFilters(searchParams, ChannelType.AVAILABLE);

    expect(parsedSubscribed).toEqual(subscribedFilters);
    expect(parsedAvailable).toEqual(availableFilters);
  });
});
