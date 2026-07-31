import { test, expect } from '@playwright/test';

// Epic 6.6: /dashboard shows Recommended Jobs + Skill Gap for the
// already-onboarded, already-scored e2e@test.com fixture user.
test.describe('Dashboard', () => {
  test('shows recommended jobs and a skill gap analysis for the default target role', async ({ page }) => {
    await page.goto('/en/dashboard');

    await expect(page.getByTestId('job-card').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('skill-gap-result')).toBeVisible({ timeout: 10_000 });
  });

  test('navigating to "View all jobs" goes to the full jobs list', async ({ page }) => {
    await page.goto('/en/dashboard');

    await page.getByRole('link', { name: /view all jobs/i }).click();
    await expect(page).toHaveURL(/\/en\/jobs/);
  });
});

test.describe('Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visiting /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page).toHaveURL(/\/en\/login/);
  });
});
