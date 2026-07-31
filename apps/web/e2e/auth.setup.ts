import { test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ request }) => {
  const res = await request.post('/api/test/auth', {
    data: { email: 'e2e@test.com' },
  });
  if (!res.ok()) {
    throw new Error(`Failed to authenticate test user: ${res.status()} ${await res.text()}`);
  }
  await request.storageState({ path: authFile });
});
