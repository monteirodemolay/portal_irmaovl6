import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ permission: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/auth/require-permission', () => ({
  requirePagePermission: mocks.permission,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import Page from './page';
describe('Entrada antiga de notícia', () => {
  it('preserva autorização e leva à seleção de ficha existente', async () => {
    await Page();
    expect(mocks.permission).toHaveBeenCalledWith('news:create');
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/admin/publicacoes/preparar?conteudo=noticia',
    );
  });
});
