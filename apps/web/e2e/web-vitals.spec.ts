import { test, expect } from '@playwright/test';

test.describe('Web Vitals', () => {
  test('POST /api/v1/web-vitals aceita uma métrica válida e responde 204', async ({ request }) => {
    const response = await request.post('/api/v1/web-vitals', {
      data: {
        name: 'LCP',
        value: 1234.5,
        rating: 'good',
        id: 'v1-1',
        navigationType: 'navigate',
        path: '/',
      },
    });

    expect(response.status()).toBe(204);
  });

  test('POST /api/v1/web-vitals rejeita payload inválido com 400', async ({ request }) => {
    const response = await request.post('/api/v1/web-vitals', {
      data: { name: 'NOT_A_METRIC', value: 'not-a-number' },
    });

    expect(response.status()).toBe(400);
  });

  test('navegar pela home dispara ao menos um beacon de Web Vitals', async ({ page }) => {
    const vitalsRequest = page.waitForRequest(
      (req) => req.url().includes('/api/v1/web-vitals') && req.method() === 'POST',
      { timeout: 15_000 },
    );

    await page.goto('/');
    // Interações simples ajudam alguns navegadores a finalizar métricas como CLS/INP mais cedo.
    await page.mouse.move(100, 100);
    await page.mouse.click(10, 10);

    await expect(vitalsRequest).resolves.toBeTruthy();
  });
});
