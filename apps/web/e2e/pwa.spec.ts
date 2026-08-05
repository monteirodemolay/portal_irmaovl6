import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('a home pública referencia o manifest e ele resolve com os campos esperados', async ({
    page,
    request,
  }) => {
    await page.goto('/');

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBe(true);

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('registra o service worker e ele fica ativo', async ({ page }) => {
    await page.goto('/');

    const registered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });

    expect(registered).toBe(true);
  });

  test('a página /offline existe e é servida como fallback do Service Worker', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'Você está offline' })).toBeVisible();
  });
});
