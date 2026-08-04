import { describe, expect, it } from 'vitest';
import type { Role } from '../entities/role.entity';
import type { User } from '../entities/user.entity';
import { computeUserClaims } from './compute-user-claims';

const baseFields = {
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'system',
  updatedBy: 'system',
  deletedAt: null,
  status: 'active' as const,
  ativo: true,
};

describe('computeUserClaims', () => {
  it('projeta tenantId, roleId e as permissões do papel', () => {
    const user: User = {
      ...baseFields,
      id: 'uid-1',
      tenantId: 'vl6',
      email: 'irmao@vl6.org.br',
      memberId: null,
      roleId: 'role-1',
      mfaHabilitado: false,
      ultimoLogin: null,
      statusConta: 'active',
    };
    const role: Role = {
      ...baseFields,
      id: 'role-1',
      tenantId: 'vl6',
      nome: 'Secretário',
      chave: 'secretario',
      permissoes: ['member:read', 'member:create'],
      sistemico: true,
    };

    expect(computeUserClaims(user, role)).toEqual({
      tenantId: 'vl6',
      roleId: 'role-1',
      permissions: ['member:read', 'member:create'],
    });
  });
});
