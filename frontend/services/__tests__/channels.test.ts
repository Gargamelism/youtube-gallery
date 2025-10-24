import { fetchUserChannels, fetchAvailableChannels } from '../channels';
import { TagMode, ChannelFilters } from '@/types';
import { API_BASE_URL } from '../shared';

global.fetch = jest.fn();

describe('fetchUserChannels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], count: 0 }),
    });
  });

  describe('without filters', () => {
    it('calls API without query parameters', async () => {
      await fetchUserChannels();

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels`, expect.any(Object));
    });

    it('calls API with undefined filters', async () => {
      await fetchUserChannels(undefined);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels`, expect.any(Object));
    });
  });

  describe('with search filter', () => {
    it('includes search parameter', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'tech',
      };

      await fetchUserChannels(filters);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels?search=tech`, expect.any(Object));
    });

    it('encodes special characters in search', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'C++ & Java',
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('search=');
      expect(callUrl).toContain('C%2B%2B');
    });
  });

  describe('with tag filters', () => {
    it('includes tags and tag_mode for multiple tags', async () => {
      const filters: Partial<ChannelFilters> = {
        selectedTags: ['programming', 'tutorial'],
        tagMode: TagMode.ALL,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('tags=programming%2Ctutorial');
      expect(callUrl).toContain('tag_mode=all');
    });

    it('includes tags without tag_mode for single tag', async () => {
      const filters: Partial<ChannelFilters> = {
        selectedTags: ['javascript'],
        tagMode: TagMode.ANY,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('tags=javascript');
      expect(callUrl).not.toContain('tag_mode');
    });

    it('omits tags when array is empty', async () => {
      const filters: Partial<ChannelFilters> = {
        selectedTags: [],
        tagMode: TagMode.ALL,
        search: 'test',
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).not.toContain('tags=');
      expect(callUrl).not.toContain('tag_mode');
      expect(callUrl).toContain('search=test');
    });

    it('uses ANY mode for multiple tags', async () => {
      const filters: Partial<ChannelFilters> = {
        selectedTags: ['react', 'vue'],
        tagMode: TagMode.ANY,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('tag_mode=any');
    });
  });

  describe('with pagination', () => {
    it('includes page parameter', async () => {
      const filters: Partial<ChannelFilters> = {
        page: 3,
      };

      await fetchUserChannels(filters);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels?page=3`, expect.any(Object));
    });

    it('includes page 1', async () => {
      const filters: Partial<ChannelFilters> = {
        page: 1,
      };

      await fetchUserChannels(filters);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels?page=1`, expect.any(Object));
    });

    it('omits page when undefined', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'test',
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).not.toContain('page=');
    });
  });

  describe('combined filters', () => {
    it('combines all filter parameters', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'react',
        selectedTags: ['javascript', 'tutorial'],
        tagMode: TagMode.ALL,
        page: 2,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('search=react');
      expect(callUrl).toContain('tags=javascript%2Ctutorial');
      expect(callUrl).toContain('tag_mode=all');
    });

    it('combines search and pagination', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'python',
        page: 5,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('page=5');
      expect(callUrl).toContain('search=python');
    });

    it('combines tags and pagination', async () => {
      const filters: Partial<ChannelFilters> = {
        selectedTags: ['coding', 'beginner'],
        tagMode: TagMode.ANY,
        page: 3,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('page=3');
      expect(callUrl).toContain('tags=coding%2Cbeginner');
      expect(callUrl).toContain('tag_mode=any');
    });
  });

  describe('edge cases', () => {
    it('handles empty filters object', async () => {
      await fetchUserChannels({});

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels`, expect.any(Object));
    });

    it('handles empty search string', async () => {
      const filters: Partial<ChannelFilters> = {
        search: '',
        page: 2,
      };

      await fetchUserChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).not.toContain('search=');
      expect(callUrl).toContain('page=2');
    });
  });
});

describe('fetchAvailableChannels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], count: 0 }),
    });
  });

  describe('without filters', () => {
    it('calls available channels endpoint without query parameters', async () => {
      await fetchAvailableChannels();

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels/available`, expect.any(Object));
    });
  });

  describe('with search filter', () => {
    it('includes search parameter', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'javascript',
      };

      await fetchAvailableChannels(filters);

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/channels/available?search=javascript`,
        expect.any(Object)
      );
    });
  });

  describe('with pagination', () => {
    it('includes page parameter', async () => {
      const filters: Partial<ChannelFilters> = {
        page: 2,
      };

      await fetchAvailableChannels(filters);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/channels/available?page=2`, expect.any(Object));
    });
  });

  describe('with tag filters', () => {
    it('supports tag filtering for available channels', async () => {
      const filters: Partial<ChannelFilters> = {
        selectedTags: ['coding', 'tutorial'],
        tagMode: TagMode.ANY,
      };

      await fetchAvailableChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('tags=coding%2Ctutorial');
      expect(callUrl).toContain('tag_mode=any');
    });
  });

  describe('combined filters', () => {
    it('combines search and pagination', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'python',
        page: 3,
      };

      await fetchAvailableChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('search=python');
      expect(callUrl).toContain('page=3');
    });

    it('combines all parameters', async () => {
      const filters: Partial<ChannelFilters> = {
        search: 'web dev',
        selectedTags: ['html', 'css'],
        tagMode: TagMode.ALL,
        page: 1,
      };

      await fetchAvailableChannels(filters);

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('search=web+dev');
      expect(callUrl).toContain('tags=html%2Ccss');
      expect(callUrl).toContain('tag_mode=all');
      expect(callUrl).toContain('page=1');
    });
  });
});

describe('API endpoint differences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], count: 0 }),
    });
  });

  it('fetchUserChannels uses /auth/channels endpoint', async () => {
    await fetchUserChannels();

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toBe(`${API_BASE_URL}/auth/channels`);
  });

  it('fetchAvailableChannels uses /auth/channels/available endpoint', async () => {
    await fetchAvailableChannels();

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toBe(`${API_BASE_URL}/auth/channels/available`);
  });

  it('both functions use same filter parameters', async () => {
    const filters: Partial<ChannelFilters> = {
      search: 'test',
      page: 2,
    };

    await fetchUserChannels(filters);
    const userChannelsUrl = (global.fetch as jest.Mock).mock.calls[0][0];

    jest.clearAllMocks();

    await fetchAvailableChannels(filters);
    const availableChannelsUrl = (global.fetch as jest.Mock).mock.calls[0][0];

    expect(userChannelsUrl).toContain('search=test');
    expect(userChannelsUrl).toContain('page=2');
    expect(availableChannelsUrl).toContain('search=test');
    expect(availableChannelsUrl).toContain('page=2');
  });
});
