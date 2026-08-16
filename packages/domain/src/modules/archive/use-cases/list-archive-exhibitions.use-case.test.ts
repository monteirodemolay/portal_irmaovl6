import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveExhibitionRepository } from '../../../test/fakes';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import { ListArchiveExhibitionsUseCase } from './list-archive-exhibitions.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveExhibition:read'],
};

function makeExhibition(overrides: Partial<ArchiveExhibition>): ArchiveExhibition {
  return {
    id: 'e1',
    tenantId: 't1',
    titulo: 'Exposição',
    slug: 'exposicao',
    descricaoEditorial: null,
    curadoPor: null,
    capaUrl: null,
    secoes: [],
    publicado: false,
    ordem: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListArchiveExhibitionsUseCase', () => {
  it('lista todas as exposições do tenant, publicadas ou não', async () => {
    const repo = new InMemoryArchiveExhibitionRepository();
    await repo.create(makeExhibition({ id: 'e1', publicado: false }));
    await repo.create(makeExhibition({ id: 'e2', slug: 'exposicao-2', publicado: true }));
    await repo.create(makeExhibition({ id: 'e3', tenantId: 't2', slug: 'exposicao-outro-tenant' }));

    const useCase = new ListArchiveExhibitionsUseCase({ archiveExhibitionRepository: repo });
    const result = await useCase.execute(ctx);

    expect(result.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
  });
});
