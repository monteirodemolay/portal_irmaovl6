import { describe, expect, it } from 'vitest';
import type { ArchiveExhibitionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveExhibitionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveExhibitionUseCase } from './create-archive-exhibition.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveExhibition:create'],
};

const input: ArchiveExhibitionFormValues = {
  titulo: '100 Anos da Loja',
  slug: '100-anos-da-loja',
  descricaoEditorial: 'Uma narrativa em três atos sobre a fundação da Loja.',
  curadoPor: 'Biblioteca da Loja',
  capaUrl: null,
  ordem: 0,
};

function buildUseCase() {
  const archiveExhibitionRepository = new InMemoryArchiveExhibitionRepository();
  const useCase = new CreateArchiveExhibitionUseCase({
    archiveExhibitionRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveExhibitionRepository };
}

describe('CreateArchiveExhibitionUseCase', () => {
  it('cria a exposição como rascunho, sem seções', async () => {
    const { useCase, archiveExhibitionRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('100 Anos da Loja');
    expect(result.value.publicado).toBe(false);
    expect(result.value.secoes).toEqual([]);

    const stored = await archiveExhibitionRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('rejeita slug já usado no mesmo tenant', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(ctx, input);

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it('lança ForbiddenError quando falta a permissão archiveExhibition:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
