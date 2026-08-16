import { describe, expect, it } from 'vitest';
import type { ArchiveExhibitionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveExhibitionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveExhibitionUseCase } from './create-archive-exhibition.use-case';
import { UpdateArchiveExhibitionUseCase } from './update-archive-exhibition.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveExhibition:manage'],
};

const baseInput: ArchiveExhibitionFormValues = {
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
  const updateUseCase = new UpdateArchiveExhibitionUseCase({ archiveExhibitionRepository, clock });

  const created = await createUseCase.execute(ctx, baseInput);
  if (!created.ok) throw new Error('setup falhou');

  return { archiveExhibitionRepository, updateUseCase, exhibitionId: created.value.id };
}

describe('UpdateArchiveExhibitionUseCase', () => {
  it('atualiza metadados e seções', async () => {
    const { updateUseCase, exhibitionId, archiveExhibitionRepository } = await buildScenario();

    const result = await updateUseCase.execute(ctx, exhibitionId, {
      ...baseInput,
      titulo: '100 Anos da Loja — atualizado',
      secoes: [{ id: 's1', titulo: 'A Fundação', texto: 'Em 1926...', itemIds: ['file_1'] }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('100 Anos da Loja — atualizado');
    expect(result.value.secoes).toHaveLength(1);

    const stored = await archiveExhibitionRepository.findById(exhibitionId);
    expect(stored?.secoes[0]?.titulo).toBe('A Fundação');
  });

  it('retorna NotFoundError para ID inexistente', async () => {
    const { updateUseCase } = await buildScenario();

    const result = await updateUseCase.execute(ctx, 'nao-existe', { ...baseInput, secoes: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita troca de slug para um já usado por outra exposição', async () => {
    const { updateUseCase, archiveExhibitionRepository, exhibitionId } = await buildScenario();
    await archiveExhibitionRepository.create({
      ...(await archiveExhibitionRepository.findById(exhibitionId))!,
      id: 'outra-exposicao-id',
      slug: 'outra-exposicao',
    });

    const result = await updateUseCase.execute(ctx, exhibitionId, {
      ...baseInput,
      slug: 'outra-exposicao',
      secoes: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });
});
