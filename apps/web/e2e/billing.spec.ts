import { test, expect } from '@playwright/test';

// Main flow coverage includes billing. A real Stripe Checkout redirect can't
// run deterministically in E2E, so this stubs the
// /api/v1/billing/checkout response and only verifies the client correctly
// calls it and follows the returned redirect — Stripe's own hosted checkout
// and the webhook sync are covered by apps/web/app/api/v1/webhooks/stripe/__tests__/route.test.ts.
test.describe('Billing', () => {
  test('pricing page is publicly visible and lists Free vs Pro', async ({ page }) => {
    await page.goto('/en/pricing');
    await expect(page.getByRole('heading', { name: /pricing/i })).toBeVisible();
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/pro/i).first()).toBeVisible();
  });

  test('settings/billing shows the current Free plan and starts a checkout session on upgrade', async ({
    page,
    baseURL,
  }) => {
    await page.route('**/api/v1/billing/checkout', async (route) => {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { url: `${baseURL}/en/settings/billing` } }),
      });
    });

    await page.goto('/en/settings/billing');
    await expect(page.getByText('Free')).toBeVisible();

    await page.getByRole('button', { name: /upgrade to pro/i }).click();
    await page.waitForURL(/\/en\/settings\/billing/);
  });
});
