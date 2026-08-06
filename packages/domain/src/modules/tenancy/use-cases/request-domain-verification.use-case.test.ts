import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryTenantDomainVerificationRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { RequestDomainVerificationUseCase } from './request-domain-verification.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['tenant:manage'],
};

function buildUseCase() {
  const domainVerificationRepository = new InMemoryTenantDomainVerificationRepository();
  const useCase = new RequestDomainVerificationUseCase({
    domainVerificationRepository,
    clock: new FixedClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, domainVerificationRepository };
}

describe('RequestDomainVerificationUseCase', () => {
  it('cria um registro de verificação pendente com token', async () => {
    const { useCase, domainVerificationRepository } = buildUseCase();

    const result = await useCase.execute(ctx, { domain: 'Minha-Loja.com.br' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('minha-loja.com.br');
    expect(result.value.verified).toBe(false);
    expect(result.value.token).toBeTruthy();

    const persisted = await domainVerificationRepository.findByDomain('minha-loja.com.br');
    expect(persisted).not.toBeNull();
  });

  it('rejeita domínio já verificado por outro tenant', async () => {
    const { useCase, domainVerificationRepository } = buildUseCase();
    await domainVerificationRepository.create({
      id: 'ocupado.com',
      tenantId: 't2',
      token: 'x',
      verified: true,
      createdAt: new Date(),
      verifiedAt: new Date(),
    });

    const result = await useCase.execute(ctx, { domain: 'ocupado.com' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('permite reemitir para o mesmo tenant (gera token novo)', async () => {
    const { useCase, domainVerificationRepository } = buildUseCase();
    await domainVerificationRepository.create({
      id: 'minhaloja.com',
      tenantId: 't1',
      token: 'token-antigo',
      verified: false,
      createdAt: new Date('2020-01-01'),
      verifiedAt: null,
    });

    const result = await useCase.execute(ctx, { domain: 'minhaloja.com' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.token).not.toBe('token-antigo');
  });

  it('rejeita quem não tem permissão tenant:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao, { domain: 'minhaloja.com' })).rejects.toThrow(
      'Permissão ausente: tenant:manage.',
    );
  });
});
