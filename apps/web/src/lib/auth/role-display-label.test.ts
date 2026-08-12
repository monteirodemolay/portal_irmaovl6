import { describe, expect, it } from 'vitest';
import type { Role } from '@vl6/domain';
import { roleDisplayLabel } from './role-display-label';

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    tenantId: 't1',
    nome: 'Membro',
    chave: 'membro',
    permissoes: [],
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

describe('roleDisplayLabel', () => {
  it('sem papel resolvido, usa "Irmão" como rótulo padrão', () => {
    expect(roleDisplayLabel(null)).toBe('Irmão');
  });

  it('super_admin vira "Administrador Geral"', () => {
    expect(roleDisplayLabel(buildRole({ chave: 'super_admin' }))).toBe('Administrador Geral');
  });

  it('admin vira "Administrador da Loja"', () => {
    expect(roleDisplayLabel(buildRole({ chave: 'admin' }))).toBe('Administrador da Loja');
  });

  it('membro vira "Membro"', () => {
    expect(roleDisplayLabel(buildRole({ chave: 'membro' }))).toBe('Membro');
  });

  it('papel customizado usa o próprio nome cadastrado', () => {
    expect(
      roleDisplayLabel(buildRole({ chave: 'editor-noticias', sistemico: false, nome: 'Editor de Notícias' })),
    ).toBe('Editor de Notícias');
  });
});
