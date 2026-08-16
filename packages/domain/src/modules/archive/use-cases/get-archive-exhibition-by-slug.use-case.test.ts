import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveExhibitionRepository } from '../../../test/fakes';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import { GetArchiveExhibitionBySlugUseCase } from './get-archive-exhibition-by-slug.use-case';

const ctx: AuthContext = {
  uid: 'membro-1',
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

describe('GetArchiveExhibitionBySlugUseCase', () => {
  it('retorna a exposição publicada', async () => {
    const repo = new InMemoryArchiveExhibitionRepository();
    await repo.create(makeExhibition({ publicado: true }));

    const useCase = new GetArchiveExhibitionBySlugUseCase({ archiveExhibitionRepository: repo });
    const result = await useCase.execute(ctx, 'exposicao');

    expect(result?.id).toBe('e1');
  });

  it('retorna null para exposição não publicada, sem distinguir de "não existe"', async () => {
    const repo = new InMemoryArchiveExhibitionRepository();
    await repo.create(makeExhibition({ publicado: false }));

    const useCase = new GetArchiveExhibitionBySlugUseCase({ archiveExhibitionRepository: repo });

    expect(await useCase.execute(ctx, 'exposicao')).toBeNull();
    expect(await useCase.execute(ctx, 'nao-existe')).toBeNull();
  });
});
