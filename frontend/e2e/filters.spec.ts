import { test, expect } from '@playwright/test';
import { setupPage } from './helpers';

test.describe('Filter bar', () => {
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test('filter bar is rendered on the videos page', async ({ page }) => {
    await expect(page.locator('.FilterButtons__wrapper')).toBeVisible();
  });

  test('shorter than input updates URL query params', async ({ page }) => {
    const input = page.locator('.FilterButtons__shorter-than input');
    await input.fill('15');
    await input.press('Tab');
    await expect(page).toHaveURL(/shorter_than=15/);
  });

  test('longer than input updates URL query params', async ({ page }) => {
    const input = page.locator('.FilterButtons__longer-than input');
    await input.fill('5');
    await input.press('Tab');
    await expect(page).toHaveURL(/longer_than=5/);
  });

  test('hide shorts toggle changes URL when toggled on', async ({ page }) => {
    const toggle = page.locator('#hide-shorts-toggle');
    await toggle.click();
    await expect(page).toHaveURL(/is_short=false/);
  });

  test('hide shorts toggle clears URL param when toggled off', async ({ page }) => {
    const toggle = page.locator('#hide-shorts-toggle');
    await toggle.click(); // on
    await toggle.click(); // off
    await expect(page).not.toHaveURL(/is_short=/);
  });

  test('hide not interested toggle is on by default', async ({ page }) => {
    const toggle = page.locator('#hide-not-interested-toggle');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('hide not interested toggle off updates URL', async ({ page }) => {
    const toggle = page.locator('#hide-not-interested-toggle');
    await toggle.click();
    await expect(page).toHaveURL(/not_interested_filter=include/);
  });

  test('add tag dropdown shows available tags', async ({ page }) => {
    const addTagBtn = page.locator('.AddTagDropdown__trigger');
    await addTagBtn.click();
    await expect(page.locator('.AddTagDropdown__menu')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.AddTagDropdown__item').first()).toBeVisible();
  });

  test('selecting a tag from dropdown adds it as a filter pill', async ({ page }) => {
    await page.locator('.AddTagDropdown__trigger').click();
    const firstTag = page.locator('.AddTagDropdown__item').first();
    const tagName = await firstTag.textContent();
    await firstTag.click();

    await expect(
      page.locator('.FilterButtons__tags .TagBadge').filter({ hasText: tagName?.trim() ?? '' })
    ).toBeVisible();
    await expect(page).toHaveURL(/tags=/);
  });

  test('removing a tag pill clears that filter', async ({ page }) => {
    // Add a tag first
    await page.locator('.AddTagDropdown__trigger').click();
    await page.locator('.AddTagDropdown__item').first().click();
    await expect(page).toHaveURL(/tags=/);

    // Remove it
    await page.locator('.TagBadge__remove-button').first().click();
    await expect(page).not.toHaveURL(/tags=/);
  });

  test('clear all removes all active tag filters', async ({ page }) => {
    // Add two tags
    await page.locator('.AddTagDropdown__trigger').click();
    await page.locator('.AddTagDropdown__item').first().click();
    await page.locator('.AddTagDropdown__trigger').click();
    await page.locator('.AddTagDropdown__item').first().click();

    await page.locator('.FilterButtons__clear-all').click();
    await expect(page).not.toHaveURL(/tags=/);
    await expect(page.locator('.FilterButtons__clear-all')).not.toBeVisible();
  });

  test('tag mode "All of these tags" updates URL', async ({ page }) => {
    // Add a tag to reveal mode buttons
    await page.locator('.AddTagDropdown__trigger').click();
    await page.locator('.AddTagDropdown__item').first().click();

    await page.locator('.FilterButtons__tag-mode button').filter({ hasText: 'All of these tags' }).click();
    await expect(page).toHaveURL(/tag_mode=all/);
  });

  test('watch status tabs switch filter in URL', async ({ page }) => {
    await page
      .locator('.WatchStatusTabs__tab')
      .filter({ hasText: /^Watched/ })
      .click();
    await expect(page).toHaveURL(/filter=watched/);

    await page
      .locator('.WatchStatusTabs__tab')
      .filter({ hasText: /^All Videos/ })
      .click();
    await expect(page).toHaveURL(/filter=all/);
  });
});
