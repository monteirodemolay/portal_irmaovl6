import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import type { MemberTitle } from '../entities/member-title.entity';
import { FixedClock, InMemoryMemberTitleRepository } from '../../../test/fakes';
import { RemoveMemberTitleUseCase } from './remove-member-title.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:manage'],
};

function buildTitle(overrides: Partial<MemberTitle> = {}): MemberTitle {
  return {
    id: 'title-1',
    tenantId: 't1',
    memberId: 'member-1',
    titulo: 'benfeitor',
    tituloOutro: null,
    dataConcessao: new Date('2020-01-01'),
    fundamento: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberTitleRepository = new InMemoryMemberTitleRepository();
  const useCase = new RemoveMemberTitleUseCase({
    memberTitleRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
  });
  return { useCase, memberTitleRepository };
}

describe('RemoveMemberTitleUseCase', () => {
  it('marca o título como excluído (soft delete)', async () => {
    const { useCase, memberTitleRepository } = buildUseCase();
    await memberTitleRepository.create(buildTitle());

    const result = await useCase.execute(ctx, 'title-1');

    expect(result.ok).toBe(true);
    const stored = await memberTitleRepository.findById('title-1');
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.ativo).toBe(false);
  });

  it('devolve NotFoundError quando o título não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('devolve NotFoundError quando o título é de outro tenant', async () => {
    const { useCase, memberTitleRepository } = buildUseCase();
    await memberTitleRepository.create(buildTitle({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'title-1');

    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError quando falta a permissão honor:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'title-1')).rejects.toThrow(ForbiddenError);
  });
});
