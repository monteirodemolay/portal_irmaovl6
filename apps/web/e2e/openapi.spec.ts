import { test, expect } from '@playwright/test';

test.describe('OpenAPI', () => {
  test('GET /api/v1/openapi.json publica um documento OpenAPI 3.1 válido', async ({ request }) => {
    const response = await request.get('/api/v1/openapi.json');
    expect(response.ok()).toBe(true);

    const document = await response.json();
    expect(document.openapi).toBe('3.1.0');
    expect(document.paths['/api/v1/auth/login']).toBeTruthy();
    expect(document.paths['/api/v1/web-vitals']).toBeTruthy();
    expect(document.paths['/api/v1/admin/members/export']).toBeTruthy();
    expect(document.components.securitySchemes.sessionCookie).toBeTruthy();
  });

  test('respostas de /api/v1/** incluem os cabeçalhos de hardening', async ({ request }) => {
    const response = await request.get('/api/v1/openapi.json');

    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
  });
});
