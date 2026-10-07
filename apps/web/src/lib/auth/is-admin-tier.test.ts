import { describe, expect, it } from 'vitest';
import type { Role } from '@vl6/domain';
import { isAdminPathAllowed, isAdminTier } from './is-admin-tier';
const role = (chave: string, sistemico = true): Role => ({
  id: 'r',
  tenantId: 'loja-a',
  nome: chave,
  chave,
  sistemico,
  permissoes: ['libraryItem:manage'],
  createdAt: new Date(0),
  updatedAt: new Date(0),
  createdBy: 'u',
  updatedBy: 'u',
  deletedAt: null,
  status: 'active',
  ativo: true,
});
describe('Central de Administração: restrições de prefixo', () => {
  it('mantém o Bibliotecário no Acervo e nas configurações', () => {
    const librarian = role('bibliotecario');
    expect(isAdminTier(librarian)).toBe(true);
    for (const path of [
      '/admin',
      '/admin/acervo/biblioteca',
      '/admin/acervo/publicar',
      '/admin/configuracoes/geral',
    ])
      expect(isAdminPathAllowed(librarian, path)).toBe(true);
    for (const path of [
      '/admin/publicacoes',
      '/admin/cripta',
      '/admin/cripta/projetor',
      '/admin/conhecimento',
      '/admin/pessoas',
      '/admin/acervo-outro',
    ])
      expect(isAdminPathAllowed(librarian, path)).toBe(false);
  });
  it('não concede nível administrativo a membro ou sessão ausente', () => {
    expect(isAdminTier(role('membro'))).toBe(false);
    expect(isAdminTier(null)).toBe(false);
    expect(isAdminPathAllowed(null, '/admin')).toBe(false);
  });
  it('preserva as rotas de papéis personalizados; operações continuam a exigir sua permissão', () => {
    const custom = role('editor-local', false);
    expect(isAdminTier(custom)).toBe(true);
    expect(isAdminPathAllowed(custom, '/admin/publicacoes')).toBe(true);
  });
});
