import { buildVideoQueryParams } from '../videos';
import { TagMode } from '@/types';

describe('buildVideoQueryParams', () => {
  describe('filter parameter', () => {
    it('should include watch_status when filter is "watched"', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('watch_status=watched');
    });

    it('should include watch_status when filter is "unwatched"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('watch_status=unwatched');
    });

    it('should not include watch_status when filter is "all"', () => {
      const result = buildVideoQueryParams({
        filter: 'all',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('');
    });

    it('should not include watch_status when filter is empty string', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('');
    });
  });

  describe('tag parameters', () => {
    it('should include tags and tag_mode when tags are selected', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['react', 'typescript'],
        tagMode: TagMode.ALL,
        searchQuery: '',
      });

      expect(result).toBe('tags=react%2Ctypescript&tag_mode=all');
    });

    it('should default to ANY mode when tagMode is not specified', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['javascript'],
        tagMode: '' as TagMode, // Force empty to test defaulting
        searchQuery: '',
      });

      expect(result).toBe('tags=javascript&tag_mode=any');
    });

    it('should use ANY mode for tag_mode', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['vue', 'nuxt'],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('tags=vue%2Cnuxt&tag_mode=any');
    });

    it('should not include tags when array is empty', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ALL,
        searchQuery: '',
      });

      expect(result).toBe('watch_status=watched');
    });

    it('should handle single tag', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['tutorial'],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('tags=tutorial&tag_mode=any');
    });

    it('should handle multiple tags with special characters', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['C++', 'Node.js', 'Web Dev'],
        tagMode: TagMode.ALL,
        searchQuery: '',
      });

      expect(result).toContain('tags=C%2B%2B%2CNode.js%2CWeb+Dev');
      expect(result).toContain('tag_mode=all');
    });
  });

  describe('search parameter', () => {
    it('should include search query when provided', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'react tutorial',
      });

      expect(result).toBe('search=react+tutorial');
    });

    it('should not include search when query is empty string', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('watch_status=unwatched');
    });

    it('should encode special characters in search query', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'hello & world!',
      });

      expect(result).toBe('search=hello+%26+world%21');
    });
  });

  describe('pagination parameters', () => {
    it('should include page when provided as positive number', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page: 2,
      });

      expect(result).toBe('page=2');
    });

    it('should include page_size when provided as positive number', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page_size: 50,
      });

      expect(result).toBe('page_size=50');
    });

    it('should include both page and page_size', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page: 3,
        page_size: 25,
      });

      expect(result).toBe('page=3&page_size=25');
    });

    it('should not include page when 0', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page: 0,
      });

      expect(result).toBe('watch_status=watched');
    });

    it('should not include page when negative', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page: -1,
      });

      expect(result).toBe('watch_status=watched');
    });

    it('should not include page_size when 0', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page_size: 0,
      });

      expect(result).toBe('watch_status=watched');
    });

    it('should not include page_size when negative', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page_size: -10,
      });

      expect(result).toBe('watch_status=watched');
    });

    it('should not include page when omitted', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('watch_status=watched');
    });
  });

  describe('combined parameters', () => {
    it('should combine all parameters when provided', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: ['react', 'typescript'],
        tagMode: TagMode.ALL,
        searchQuery: 'advanced tutorial',
        page: 2,
        page_size: 20,
      });

      expect(result).toContain('watch_status=unwatched');
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
      });

      expect(result).toBe('watch_status=watched&tags=javascript&tag_mode=any');
    });

    it('should handle filter + search combination', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'nextjs',
      });

      expect(result).toBe('watch_status=unwatched&search=nextjs');
    });

    it('should handle tags + search combination', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: ['vue'],
        tagMode: TagMode.ANY,
        searchQuery: 'composition api',
      });

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
        page: 5,
        page_size: 100,
      });

      expect(result).toBe('watch_status=watched&page=5&page_size=100');
    });
  });

  describe('edge cases', () => {
    it('should return empty string when all parameters are empty/default', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('');
    });

    it('should return empty string when filter is "all" and no other params', () => {
      const result = buildVideoQueryParams({
        filter: 'all',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
      });

      expect(result).toBe('');
    });

    it('should handle whitespace-only search query', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '   ',
      });

      expect(result).toBe('search=+++');
    });

    it('should handle extremely long tag arrays', () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: manyTags,
        tagMode: TagMode.ALL,
        searchQuery: '',
      });

      expect(result).toContain('tags=');
      expect(result).toContain('tag_mode=all');
      expect(result.match(new RegExp('%2C', 'g'))?.length).toBe(49); // 49 commas for 50 tags
    });

    it('should handle large page numbers', () => {
      const result = buildVideoQueryParams({
        filter: '',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page: 999999,
      });

      expect(result).toBe('page=999999');
    });
  });

  describe('real-world scenarios', () => {
    it('should build query for "show me unwatched React tutorials"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: ['react'],
        tagMode: TagMode.ANY,
        searchQuery: 'tutorial',
        page: 1,
        page_size: 24,
      });

      expect(result).toContain('watch_status=unwatched');
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
      });

      expect(result).toBe('tags=react%2Ctypescript&tag_mode=all');
    });

    it('should build query for "watched videos on page 3"', () => {
      const result = buildVideoQueryParams({
        filter: 'watched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: '',
        page: 3,
      });

      expect(result).toBe('watch_status=watched&page=3');
    });

    it('should build query for "search for Next.js in unwatched videos"', () => {
      const result = buildVideoQueryParams({
        filter: 'unwatched',
        selectedTags: [],
        tagMode: TagMode.ANY,
        searchQuery: 'Next.js',
      });

      expect(result).toBe('watch_status=unwatched&search=Next.js');
    });
  });
});