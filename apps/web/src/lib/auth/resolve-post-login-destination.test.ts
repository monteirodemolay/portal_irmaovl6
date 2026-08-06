import { describe, expect, it } from 'vitest';
import type { Role } from '@vl6/domain';
import { resolvePostLoginDestination } from './resolve-post-login-destination';

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    tenantId: 't1',
    nome: 'Irmão',
    chave: 'irmao',
    permissoes: ['news:read'],
    sistemico: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'seed',
    updatedBy: 'seed',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('resolvePostLoginDestination', () => {
  it('manda o Administrador Geral pra /plataforma, sem olhar o papel', () => {
    expect(resolvePostLoginDestination('platform', null)).toBe('/plataforma');
    expect(resolvePostLoginDestination('platform', buildRole({ chave: 'irmao' }))).toBe(
      '/plataforma',
    );
  });

  it('sem papel resolvido, cai na Área do Irmão', () => {
    expect(resolvePostLoginDestination('t1', null)).toBe('/dashboard');
  });

  it.each(['admin', 'veneravel_mestre', 'secretario', 'tesoureiro', 'diretoria'])(
    'papel de fábrica "%s" vai pro /admin',
    (chave) => {
      expect(resolvePostLoginDestination('t1', buildRole({ chave, sistemico: true }))).toBe(
        '/admin',
      );
    },
  );

  it.each(['irmao', 'visitante', 'comissao'])(
    'papel de fábrica "%s" vai pra Área do Irmão',
    (chave) => {
      expect(resolvePostLoginDestination('t1', buildRole({ chave, sistemico: true }))).toBe(
        '/dashboard',
      );
    },
  );

  it('papel customizado só de leitura vai pra Área do Irmão', () => {
    const role = buildRole({
      chave: 'observador',
      sistemico: false,
      permissoes: ['news:read', 'event:read'],
    });
    expect(resolvePostLoginDestination('t1', role)).toBe('/dashboard');
  });

  it('papel customizado com alguma permissão de escrita vai pro /admin', () => {
    const role = buildRole({
      chave: 'editor-noticias',
      sistemico: false,
      permissoes: ['news:read', 'news:create'],
    });
    expect(resolvePostLoginDestination('t1', role)).toBe('/admin');
  });
});
