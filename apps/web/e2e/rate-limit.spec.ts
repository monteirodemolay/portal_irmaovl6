import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('exportação de Irmãos aplica rate limit por usuário (10/min)', async ({ page }) => {
  await loginAsAdmin(page);

  const statuses: number[] = [];
  for (let i = 0; i < 11; i++) {
    const response = await page.request.get('/api/v1/admin/members/export');
    statuses.push(response.status());
    if (i === 10) {
      expect(response.headers()['retry-after']).toBeTruthy();
      await expect(response.json()).resolves.toMatchObject({ error: 'rate_limited' });
    }
  }

  expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
  expect(statuses[10]).toBe(429);
});
