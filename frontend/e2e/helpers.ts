import { Page } from '@playwright/test';

const MOCK_TAGS = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'tag-1',
      name: 'Programming',
      color: '#6366f1',
      description: null,
      channel_count: 3,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'tag-2',
      name: 'Tutorial',
      color: '#8b5cf6',
      description: null,
      channel_count: 2,
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
};

const MOCK_STATS = { total: 10, watched: 3, unwatched: 7, not_interested: 0 };

const MOCK_VIDEOS = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      uuid: 'video-uuid-1',
      video_id: 'dQw4w9WgXcQ',
      channel_title: 'Test Channel',
      title: 'Test Video Title',
      description: 'A test video description',
      published_at: '2024-01-15T00:00:00Z',
      duration: 'PT5M30S',
      view_count: 1000,
      like_count: 100,
      comment_count: 10,
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      is_watched: false,
      watched_at: null,
      notes: null,
      is_not_interested: false,
      not_interested_at: null,
      channel_tags: [
        {
          id: 'tag-1',
          name: 'Programming',
          color: '#6366f1',
          description: null,
          channel_count: 3,
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      watch_progress_seconds: 0,
      watch_percentage: 0,
      auto_marked_watched: false,
    },
  ],
};

/**
 * Sets up authenticated state with mocked API responses and navigates to /videos.
 *
 * Fixes three problems the naive localStorage-only approach has:
 *   1. Next.js middleware checks a cookie, not localStorage — without it the browser
 *      is redirected to /auth before React ever mounts.
 *   2. The Zustand auth store reads from `localStorage['youtube_gallery'].auth`,
 *      not the old `localStorage['youtube-gallery-auth']` key.
 *   3. Browser-side API calls go to http://{hostname}:8000/api which is unreachable
 *      inside the Playwright Docker container — intercepted and fulfilled here.
 */
export async function setupPage(page: Page): Promise<void> {
  // Intercept all backend API calls with a single handler to avoid FIFO/LIFO ambiguity.
  await page.route('**/api/**', route => {
    const url = route.request().url();

    if (url.includes('/api/videos/stats')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_STATS) });
    }
    if (url.includes('/api/auth/tags')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_TAGS) });
    }
    if (url.includes('/api/videos')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(MOCK_VIDEOS) });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Navigate to a public page first so we have a domain for the cookie.
  await page.goto('/');

  // Set the auth cookie that Next.js middleware checks on every protected-route request.
  await page.context().addCookies([
    {
      name: 'youtube-gallery-auth',
      value: 'test-session-token',
      url: page.url(),
    },
  ]);

  // Populate the Zustand auth store via localStorage (correct key/structure).
  await page.evaluate(() => {
    localStorage.setItem(
      'youtube_gallery',
      JSON.stringify({
        auth: {
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            is_staff: false,
            created_at: '2024-01-01T00:00:00Z',
          },
          isAuthenticated: true,
        },
      })
    );
  });

  await page.goto('/videos');
}
