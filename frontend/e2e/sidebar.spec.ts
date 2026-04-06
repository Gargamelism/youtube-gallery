import { test, expect } from '@playwright/test';

/**
 * Sidebar E2E tests.
 * These tests verify the collapsible sidebar behaviour and tag filtering.
 * They require an authenticated session — set E2E_USERNAME and E2E_PASSWORD
 * and run auth.setup.ts first, or mock the auth cookie before navigating.
 */
test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a minimal auth cookie so the app considers us logged in
    await page.goto('/');
    await page.evaluate(() => {
      const authData = JSON.stringify({
        user: { id: '1', username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
        isAuthenticated: true,
      });
      localStorage.setItem('youtube-gallery-auth', JSON.stringify({ state: JSON.parse(authData) }));
    });
    await page.goto('/videos');
  });

  test('sidebar is visible on the videos page', async ({ page }) => {
    await expect(page.locator('.Sidebar')).toBeVisible();
  });

  test('sidebar collapses when chevron button is clicked', async ({ page }) => {
    const sidebar = page.locator('.Sidebar');
    const collapseBtn = page.locator('.Sidebar__collapse-btn');

    await expect(sidebar).toHaveClass(/w-64/);
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/w-16/);
  });

  test('sidebar expands after collapsing', async ({ page }) => {
    const collapseBtn = page.locator('.Sidebar__collapse-btn');

    await collapseBtn.click();
    await expect(page.locator('.Sidebar')).toHaveClass(/w-16/);

    await collapseBtn.click();
    await expect(page.locator('.Sidebar')).toHaveClass(/w-64/);
  });

  test('collapse state persists across page reload', async ({ page }) => {
    const collapseBtn = page.locator('.Sidebar__collapse-btn');
    await collapseBtn.click();
    await expect(page.locator('.Sidebar')).toHaveClass(/w-16/);

    await page.reload();
    await expect(page.locator('.Sidebar')).toHaveClass(/w-16/);
  });

  test('clicking a sidebar tag adds it to the filter bar', async ({ page }) => {
    // Wait for tags to load in sidebar
    const sidebarTag = page.locator('.Sidebar__tag-item').first();
    await expect(sidebarTag).toBeVisible({ timeout: 10000 });

    const tagName = await sidebarTag.textContent();
    await sidebarTag.click();

    // The tag should now appear as a pill in the filter bar
    await expect(
      page.locator('.FilterButtons__tags .TagBadge').filter({ hasText: tagName?.trim() ?? '' })
    ).toBeVisible();
  });

  test('sidebar tag click updates the URL query params', async ({ page }) => {
    const sidebarTag = page.locator('.Sidebar__tag-item').first();
    await expect(sidebarTag).toBeVisible({ timeout: 10000 });

    await sidebarTag.click();
    await expect(page).toHaveURL(/tags=/);
  });

  test('Videos nav link is active on /videos route', async ({ page }) => {
    await expect(page.locator('.Sidebar__nav-link').filter({ hasText: 'Videos' })).toHaveClass(/bg-purple-100/);
  });

  test('clicking Channels nav link navigates to /channels', async ({ page }) => {
    await page.locator('.Sidebar__nav-link').filter({ hasText: 'Channels' }).click();
    await expect(page).toHaveURL('/channels');
  });
});
