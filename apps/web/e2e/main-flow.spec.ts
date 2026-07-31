import { test, expect } from '@playwright/test';

// e2e@test.com (see packages/db/prisma/seed.ts) has already completed onboarding
// and has scores covering all three decisions (APPLY/MAYBE/SKIP), so this file
// focuses on the "logged-in user views scored jobs list -> detail" main flow
// rather than walking through the onboarding form from scratch (onboarding
// form field validation is Epic 3 scope and not covered here).
test.describe('Main User Flow', () => {
  test('view scored jobs list and job detail', async ({ page }) => {
    await page.goto('/en/jobs');

    const jobCards = page.getByTestId('job-card');
    await expect(jobCards.first()).toBeVisible({ timeout: 30_000 });

    const scoreBadge = page.getByTestId('score-badge').first();
    await expect(scoreBadge).toBeVisible();
    const scoreText = await scoreBadge.textContent();
    expect(Number(scoreText)).toBeGreaterThan(0);

    await jobCards.first().click();
    await expect(page).toHaveURL(/\/en\/jobs\/.+/);

    await expect(page.getByTestId('score-analysis')).toBeVisible();
    await expect(page.getByTestId('job-description')).toBeVisible();
  });

  test('jobs list filters by decision', async ({ page }) => {
    await page.goto('/en/jobs?decision=APPLY');

    const decisionBadges = page.getByTestId('decision-badge');
    await expect(decisionBadges.first()).toBeVisible({ timeout: 30_000 });

    const count = await decisionBadges.count();
    for (let i = 0; i < count; i++) {
      await expect(decisionBadges.nth(i)).toHaveText('APPLY');
    }
  });
});

test.describe('Unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('visiting /jobs redirects to /login', async ({ page }) => {
    await page.goto('/en/jobs');
    await expect(page).toHaveURL(/\/en\/login/);
  });
});
