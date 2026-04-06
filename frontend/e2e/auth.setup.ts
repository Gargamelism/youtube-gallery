import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../.playwright/auth.json');

/**
 * This setup fixture creates an authenticated session that can be reused
 * across E2E tests, avoiding repeated login flows.
 *
 * To run authenticated tests:
 * 1. Set E2E_USERNAME and E2E_PASSWORD environment variables
 * 2. Run: npx playwright test --project=setup
 * 3. The auth state is saved to .playwright/auth.json
 */
setup('authenticate', async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    console.warn('E2E_USERNAME and E2E_PASSWORD not set — skipping auth setup. Tests requiring auth will fail.');
    return;
  }

  await page.goto('/auth');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/videos');

  await page.context().storageState({ path: AUTH_FILE });
});
