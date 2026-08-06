import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-admin@vl6.test';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'SenhaForte123!';
export const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? 'e2e-plataforma@vl6.test';
export const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? 'SenhaForte123!';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
