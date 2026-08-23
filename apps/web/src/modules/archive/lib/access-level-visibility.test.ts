import type { Role } from '@vl6/domain';
import { describe, expect, it } from 'vitest';
import { isAccessLevelVisible } from './access-level-visibility';

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    tenantId: 'tenant-1',
    chave: 'membro',
    nome: 'Membro',
    permissoes: ['member:read'],
    sistemico: true,
    ativo: true,
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    ...overrides,
  };
}

describe('isAccessLevelVisible', () => {
  it('sempre mostra conteúdo público, autenticado ou não', () => {
    expect(isAccessLevelVisible('publico', { authenticated: false, role: null })).toBe(true);
    expect(isAccessLevelVisible('publico', { authenticated: true, role: null })).toBe(true);
  });

  it('esconde qualquer nível restrito de visitante não autenticado', () => {
    expect(isAccessLevelVisible('irmaos', { authenticated: false, role: null })).toBe(false);
    expect(isAccessLevelVisible('membros_loja', { authenticated: false, role: null })).toBe(false);
    expect(isAccessLevelVisible('administracao', { authenticated: false, role: null })).toBe(
      false,
    );
  });

  it("mostra 'irmaos' e 'membros_loja' para qualquer sessão autenticada deste portal", () => {
    const session = { authenticated: true, role: buildRole({ chave: 'membro' }) };
    expect(isAccessLevelVisible('irmaos', session)).toBe(true);
    expect(isAccessLevelVisible('membros_loja', session)).toBe(true);
  });

  it("só mostra 'administracao' para papel de tier administrativo", () => {
    const membro = { authenticated: true, role: buildRole({ chave: 'membro', sistemico: true }) };
    const admin = { authenticated: true, role: buildRole({ chave: 'admin', sistemico: true }) };
    expect(isAccessLevelVisible('administracao', membro)).toBe(false);
    expect(isAccessLevelVisible('administracao', admin)).toBe(true);
  });

  it("reconhece papel customizado com permissão de escrita como tier administrativo", () => {
    const session = {
      authenticated: true,
      role: buildRole({ sistemico: false, permissoes: ['archiveItem:manage'] }),
    };
    expect(isAccessLevelVisible('administracao', session)).toBe(true);
  });

  it('sessão sem papel resolvido (role null) autenticada não é tier administrativo', () => {
    const session = { authenticated: true, role: null };
    expect(isAccessLevelVisible('administracao', session)).toBe(false);
  });
});
