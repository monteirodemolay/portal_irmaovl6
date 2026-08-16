import { describe, expect, it } from 'vitest';
import type { ArchiveExhibitionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveExhibitionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveExhibitionUseCase } from './create-archive-exhibition.use-case';
import { PublishArchiveExhibitionUseCase } from './publish-archive-exhibition.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveExhibition:manage'],
};

const input: ArchiveExhibitionFormValues = {
  titulo: '100 Anos da Loja',
  slug: '100-anos-da-loja',
  descricaoEditorial: null,
  curadoPor: null,
  capaUrl: null,
  ordem: 0,
};

async function buildScenario() {
  const archiveExhibitionRepository = new InMemoryArchiveExhibitionRepository();
  const clock = new FixedClock(new Date('2026-01-01T00:00:00Z'));
  const createUseCase = new CreateArchiveExhibitionUseCase({
    archiveExhibitionRepository,
    clock,
    idGenerator: new SequentialIdGenerator(),
  });
  const publishUseCase = new PublishArchiveExhibitionUseCase({
    archiveExhibitionRepository,
    clock,
  });

  const created = await createUseCase.execute(ctx, input);
  if (!created.ok) throw new Error('setup falhou');

  return { archiveExhibitionRepository, publishUseCase, exhibitionId: created.value.id };
}

describe('PublishArchiveExhibitionUseCase', () => {
  it('publica a exposição', async () => {
    const { publishUseCase, exhibitionId, archiveExhibitionRepository } = await buildScenario();

    const result = await publishUseCase.execute(ctx, exhibitionId, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(true);
    expect(result.value.status).toBe('active');

    const stored = await archiveExhibitionRepository.findById(exhibitionId);
    expect(stored?.publicado).toBe(true);
  });

  it('despublica a exposição', async () => {
    const { publishUseCase, exhibitionId } = await buildScenario();
    await publishUseCase.execute(ctx, exhibitionId, true);

    const result = await publishUseCase.execute(ctx, exhibitionId, false);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(false);
    expect(result.value.status).toBe('draft');
  });

  it('retorna NotFoundError para ID inexistente', async () => {
    const { publishUseCase } = await buildScenario();

    const result = await publishUseCase.execute(ctx, 'nao-existe', true);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
