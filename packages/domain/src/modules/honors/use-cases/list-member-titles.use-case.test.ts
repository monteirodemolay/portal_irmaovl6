import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import type { MemberTitle } from '../entities/member-title.entity';
import { InMemoryMemberTitleRepository } from '../../../test/fakes';
import { ListMemberTitlesUseCase } from './list-member-titles.use-case';

const ctx: AuthContext = {
  uid: 'member-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:read'],
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

describe('ListMemberTitlesUseCase', () => {
  it('lista só os títulos do Irmão e do tenant, mais recente primeiro', async () => {
    const memberTitleRepository = new InMemoryMemberTitleRepository();
    await memberTitleRepository.create(
      buildTitle({ id: 'title-1', dataConcessao: new Date('2020-01-01') }),
    );
    await memberTitleRepository.create(
      buildTitle({
        id: 'title-2',
        titulo: 'mestre_instalado',
        dataConcessao: new Date('2023-01-01'),
      }),
    );
    await memberTitleRepository.create(buildTitle({ id: 'title-3', memberId: 'member-2' }));

    const useCase = new ListMemberTitlesUseCase({ memberTitleRepository });
    const result = await useCase.execute(ctx, 'member-1');

    expect(result.map((t) => t.id)).toEqual(['title-2', 'title-1']);
  });

  it('lança ForbiddenError quando falta a permissão honor:read', async () => {
    const memberTitleRepository = new InMemoryMemberTitleRepository();
    const useCase = new ListMemberTitlesUseCase({ memberTitleRepository });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'member-1')).rejects.toThrow(ForbiddenError);
  });
});
