import { test, expect } from '@playwright/test';
import { setupPage } from './helpers';

test.describe('Video card', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
    // Wait for at least one video card to appear
    await expect(page.locator('.VideoCard').first()).toBeVisible({ timeout: 15000 });
  });

  test('video card renders thumbnail, title, channel, and date', async ({ page }) => {
    const card = page.locator('.VideoCard').first();
    await expect(card.locator('.VideoCard__thumbnail')).toBeVisible();
    await expect(card.locator('.VideoCard__title')).toBeVisible();
    await expect(card.locator('.VideoCard__channel')).toBeVisible();
    await expect(card.locator('.VideoCard__date')).toBeVisible();
  });

  test('video card does not show description or notes UI', async ({ page }) => {
    const card = page.locator('.VideoCard').first();
    await expect(card.locator('.VideoCard__description')).not.toBeVisible();
    await expect(card.locator('.VideoCard__notes')).not.toBeVisible();
    await expect(card.locator('.VideoCard__notes-form')).not.toBeVisible();
  });

  test('mark as watched button is visible on the card', async ({ page }) => {
    const card = page.locator('.VideoCard').first();
    await expect(card.locator('.VideoCard__watch-button')).toBeVisible();
    await expect(card.locator('.VideoCard__watch-button')).toContainText(/mark as watched/i);
  });

  test('clicking thumbnail opens video player modal', async ({ page }) => {
    const card = page.locator('.VideoCard').first();
    await card.locator('.VideoCard__thumbnail').click();
    // Player opens — URL should include ?player=
    await expect(page).toHaveURL(/player=/);
  });

  test('clicking a tag on the card adds it to the filter', async ({ page }) => {
    const card = page.locator('.VideoCard').first();
    const tag = card.locator('.VideoCard__tags .TagBadge').first();
    await expect(tag).toBeVisible();
    await tag.click();
    await expect(page).toHaveURL(/tags=/);
  });

  test('channel name is displayed in purple', async ({ page }) => {
    const channel = page.locator('.VideoCard').first().locator('.VideoCard__channel');
    await expect(channel).toHaveClass(/text-purple-600/);
  });
});
