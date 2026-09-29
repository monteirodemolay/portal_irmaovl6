import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  InMemoryLegalDocumentAcceptanceRepository,
  InMemoryUserRepository,
} from '../../../test/fakes';
import type { User } from '../../identity-access/entities/user.entity';
import type { LegalDocumentAcceptance } from '../entities/legal-document-acceptance.entity';
import { ListLegalAcceptanceHistoryForUserUseCase } from './list-legal-acceptance-history-for-user.use-case';

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r-admin',
  permissions: ['legalDocument:manage'],
};
const noPermCtx: AuthContext = {
  uid: 'user-2',
  tenantId: 't1',
  roleId: 'r-membro',
  permissions: ['legalDocument:read'],
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 't1',
    email: 'fulano@vl6.org.br',
    memberId: null,
    roleId: 'role-1',
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildAcceptance(
  overrides: Partial<LegalDocumentAcceptance> = {},
): LegalDocumentAcceptance {
  return {
    id: 'a-1',
    tenantId: 't1',
    userId: 'user-1',
    documento: 'termos_uso',
    versaoAceita: '1.0.0',
    aceitoEm: new Date('2026-01-02T00:00:00Z'),
    ip: '203.0.113.1',
    userAgent: 'Mozilla/5.0',
    hashVersao: 'hash',
    origem: 'self_service',
    ...overrides,
  };
}

function buildUseCase() {
  const legalDocumentAcceptanceRepository = new InMemoryLegalDocumentAcceptanceRepository();
  const userRepository = new InMemoryUserRepository();
  const useCase = new ListLegalAcceptanceHistoryForUserUseCase({
    legalDocumentAcceptanceRepository,
    userRepository,
  });
  return { useCase, legalDocumentAcceptanceRepository, userRepository };
}

describe('ListLegalAcceptanceHistoryForUserUseCase', () => {
  it('rejeita quem não tem legalDocument:manage', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser());
    await expect(useCase.execute(noPermCtx, 'user-1')).rejects.toThrow(ForbiddenError);
  });

  it('rejeita usuário de outro tenant', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ id: 'user-2', tenantId: 't2' }));

    const result = await useCase.execute(adminCtx, 'user-2');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('retorna o histórico completo de aceites do usuário', async () => {
    const { useCase, userRepository, legalDocumentAcceptanceRepository } = buildUseCase();
    await userRepository.create(buildUser());
    await legalDocumentAcceptanceRepository.append(buildAcceptance());
    await legalDocumentAcceptanceRepository.append(
      buildAcceptance({ id: 'a-2', versaoAceita: '0.9.0', origem: 'migracao_pre_existente' }),
    );

    const result = await useCase.execute(adminCtx, 'user-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });
});
