import { buildVideoQueryParams } from '@/services/videos';
import { TagMode, NotInterestedFilter } from '@/types';

describe('buildVideoQueryParams', () => {
  describe('filter parameter', () => {
    it('should include watch_status when filter is "watched"', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });

    it('should include watch_status when filter is "unwatched"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=unwatched&not_interested_filter=exclude');
    });

    it('should not include watch_status when filter is "all"', () => {
      const result = buildVideoQueryParams({
        filter: 'all',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude');
    });

    it('should not include watch_status when filter is empty string', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude');
    });
  });

  describe('tag parameters', () => {
    it('should include tags and tag_mode when tags are selected', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['react', 'typescript'],
        tagMode: TagMode.ALL,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&tags=react%2Ctypescript&tag_mode=all');
    });

    it('should default to ANY mode when tagMode is not specified', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['javascript'],
        tagMode: '' as TagMode,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&tags=javascript&tag_mode=any');
    });

    it('should use ANY mode for tag_mode', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['vue', 'nuxt'],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&tags=vue%2Cnuxt&tag_mode=any');
    });

    it('should not include tags when array is empty', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ALL,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });

    it('should handle single tag', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['tutorial'],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&tags=tutorial&tag_mode=any');
    });

    it('should handle multiple tags with special characters', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['C++', 'Node.js', 'Web Dev'],
        tagMode: TagMode.ALL,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toContain('tags=C%2B%2B%2CNode.js%2CWeb+Dev');
      expect(result).toContain('tag_mode=all');
      expect(result).toContain('not_interested_filter=exclude');
    });
  });

  describe('search parameter', () => {
    it('should include search query when provided', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'react tutorial',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&search=react+tutorial');
    });

    it('should not include search when query is empty string', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=unwatched&not_interested_filter=exclude');
    });

    it('should encode special characters in search query', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'hello & world!',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&search=hello+%26+world%21');
    });
  });

  describe('pagination parameters', () => {
    it('should include page when provided as positive number', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 2,
      });

      expect(result).toBe('not_interested_filter=exclude&page=2');
    });

    it('should include page_size when provided as positive number', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page_size: 50,
      });

      expect(result).toBe('not_interested_filter=exclude&page_size=50');
    });

    it('should include both page and page_size', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 3,
        page_size: 25,
      });

      expect(result).toBe('not_interested_filter=exclude&page=3&page_size=25');
    });

    it('should not include page when 0', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 0,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });

    it('should not include page when negative', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: -1,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });

    it('should not include page_size when 0', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page_size: 0,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });

    it('should not include page_size when negative', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page_size: -10,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });

    it('should not include page when omitted', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude');
    });
  });

  describe('combined parameters', () => {
    it('should combine all parameters when provided', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: ['react', 'typescript'],
        tagMode: TagMode.ALL,
        searchQuery: 'advanced tutorial',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 2,
        page_size: 20,
      });

      expect(result).toContain('watch_status=unwatched');
      expect(result).toContain('not_interested_filter=exclude');
      expect(result).toContain('tags=react%2Ctypescript');
      expect(result).toContain('tag_mode=all');
      expect(result).toContain('search=advanced+tutorial');
      expect(result).toContain('page=2');
      expect(result).toContain('page_size=20');
    });

    it('should handle filter + tags combination', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: ['javascript'],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude&tags=javascript&tag_mode=any');
    });

    it('should handle filter + search combination', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'nextjs',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=unwatched&not_interested_filter=exclude&search=nextjs');
    });

    it('should handle tags + search combination', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['vue'],
        tagMode: TagMode.ANY,
        searchQuery: 'composition api',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toContain('not_interested_filter=exclude');
      expect(result).toContain('tags=vue');
      expect(result).toContain('tag_mode=any');
      expect(result).toContain('search=composition+api');
    });

    it('should handle filter + pagination combination', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 5,
        page_size: 100,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude&page=5&page_size=100');
    });
  });

  describe('edge cases', () => {
    it('should return empty string when all parameters are empty/default', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude');
    });

    it('should return empty string when filter is "all" and no other params', () => {
      const result = buildVideoQueryParams({
        filter: 'all',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude');
    });

    it('should handle whitespace-only search query', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '   ',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&search=+++');
    });

    it('should handle extremely long tag arrays', () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: manyTags,
        tagMode: TagMode.ALL,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toContain('not_interested_filter=exclude');
      expect(result).toContain('tags=');
      expect(result).toContain('tag_mode=all');
      expect(result.match(new RegExp('%2C', 'g'))?.length).toBe(49);
    });

    it('should handle large page numbers', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 999999,
      });

      expect(result).toBe('not_interested_filter=exclude&page=999999');
    });
  });

  describe('real-world scenarios', () => {
    it('should build query for "show me unwatched React tutorials"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: ['react'],
        tagMode: TagMode.ANY,
        searchQuery: 'tutorial',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 1,
        page_size: 24,
      });

      expect(result).toContain('watch_status=unwatched');
      expect(result).toContain('not_interested_filter=exclude');
      expect(result).toContain('tags=react');
      expect(result).toContain('search=tutorial');
      expect(result).toContain('page=1');
      expect(result).toContain('page_size=24');
    });

    it('should build query for "all videos with React AND TypeScript tags"', () => {
      const result = buildVideoQueryParams({
        filter: 'all',
        selectedTags: ['react', 'typescript'],
        tagMode: TagMode.ALL,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('not_interested_filter=exclude&tags=react%2Ctypescript&tag_mode=all');
    });

    it('should build query for "watched videos on page 3"', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 3,
      });

      expect(result).toBe('watch_status=watched&not_interested_filter=exclude&page=3');
    });

    it('should build query for "search for Next.js in unwatched videos"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'Next.js',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toBe('watch_status=unwatched&not_interested_filter=exclude&search=Next.js');
    });

    it('should build query for "all videos except from yoga channels"', () => {
      const result = buildVideoQueryParams({
        filter: 'all',
        selectedTags: ['yoga'],
        tagMode: TagMode.EXCEPT,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
      });

      expect(result).toContain('tags=yoga');
      expect(result).toContain('tag_mode=except');
      expect(result).toContain('not_interested_filter=exclude');
    });

    it('should build query for "unwatched videos except cooking and gardening"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: ['cooking', 'gardening'],
        tagMode: TagMode.EXCEPT,
        searchQuery: '',
        notInterestedFilter: NotInterestedFilter.EXCLUDE,
        page: 1,
        page_size: 24,
      });

      expect(result).toContain('watch_status=unwatched');
      expect(result).toContain('tags=cooking%2Cgardening');
      expect(result).toContain('tag_mode=except');
      expect(result).toContain('page=1');
      expect(result).toContain('page_size=24');
    });
  });
});
