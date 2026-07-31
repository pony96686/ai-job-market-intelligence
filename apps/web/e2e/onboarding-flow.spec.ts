import { test, expect } from '@playwright/test';

// Uses a never-onboarded fixture user (packages/db/prisma/seed.ts) instead of
// the shared e2e@test.com user, which is always pre-onboarded — this test
// exercises the real first-run flow: skills/experience/roles + Resume upload.
const ONBOARDING_EMAIL = 'e2e-onboarding@test.com';

test.describe('Onboarding flow (fresh user)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('fills profile, uploads a resume, and lands on the jobs list awaiting scoring', async ({ page }) => {
    // Uses page.request (bound to page.context()) rather than the standalone
    // request fixture, so the session cookie the response sets is actually
    // visible to the subsequent page.goto() navigation.
    const authRes = await page.request.post('/api/test/auth', { data: { email: ONBOARDING_EMAIL } });
    expect(authRes.ok()).toBe(true);

    await page.goto('/en/onboarding');

    // TagInput only renders a placeholder while it has zero tags (see
    // components/profile/tag-input.tsx), so getByPlaceholder() stops
    // matching after the first Enter — use the stable #skills id instead.
    const skillsInput = page.locator('#skills');
    await skillsInput.fill('Node.js');
    await skillsInput.press('Enter');
    await skillsInput.fill('TypeScript');
    await skillsInput.press('Enter');

    await page.getByLabel(/years of experience/i).fill('5');

    const rolesInput = page.locator('#preferredRoles');
    await rolesInput.fill('Backend Engineer');
    await rolesInput.press('Enter');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /upload resume/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Senior backend engineer with 5 years of Node.js and TypeScript experience.'),
    });
    await expect(page.getByText(/uploaded resume\.txt/i)).toBeVisible();

    await page.getByRole('button', { name: /get started/i }).click();

    await expect(page).toHaveURL(/\/en\/jobs\?scoring=true/);
    await expect(page.getByText(/AI is analyzing jobs for you/i)).toBeVisible();
  });
});
