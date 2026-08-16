import { describe, expect, it } from 'vitest';
import type { ArchiveCollectionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveCollectionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveCollectionUseCase } from './create-archive-collection.use-case';
import { UpdateArchiveCollectionUseCase } from './update-archive-collection.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCollection:manage'],
};

const baseInput: ArchiveCollectionFormValues = {
  titulo: 'Sessões Magnas de 2026',
  slug: 'sessoes-magnas-2026',
  descricaoEditorial: null,
  curadoPor: null,
  capaUrl: null,
  ordem: 0,
};

async function buildScenario() {
  const archiveCollectionRepository = new InMemoryArchiveCollectionRepository();
  const clock = new FixedClock(new Date('2026-01-01T00:00:00Z'));
  const createUseCase = new CreateArchiveCollectionUseCase({
    archiveCollectionRepository,
    clock,
    idGenerator: new SequentialIdGenerator(),
  });
  const updateUseCase = new UpdateArchiveCollectionUseCase({ archiveCollectionRepository, clock });

  const created = await createUseCase.execute(ctx, baseInput);
  if (!created.ok) throw new Error('setup falhou');

  return { archiveCollectionRepository, updateUseCase, collectionId: created.value.id };
}

describe('UpdateArchiveCollectionUseCase', () => {
  it('atualiza metadados e itemIds', async () => {
    const { updateUseCase, collectionId, archiveCollectionRepository } = await buildScenario();

    const result = await updateUseCase.execute(ctx, collectionId, {
      ...baseInput,
      titulo: 'Sessões Magnas — atualizado',
      itemIds: ['file_1', 'gallery-album_2'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Sessões Magnas — atualizado');
    expect(result.value.itemIds).toEqual(['file_1', 'gallery-album_2']);

    const stored = await archiveCollectionRepository.findById(collectionId);
    expect(stored?.itemIds).toEqual(['file_1', 'gallery-album_2']);
  });

  it('retorna NotFoundError para ID inexistente', async () => {
    const { updateUseCase } = await buildScenario();

    const result = await updateUseCase.execute(ctx, 'nao-existe', {
      ...baseInput,
      itemIds: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita troca de slug para um já usado por outra coleção', async () => {
    const { updateUseCase, archiveCollectionRepository, collectionId } = await buildScenario();
    await archiveCollectionRepository.create({
      ...(await archiveCollectionRepository.findById(collectionId))!,
      id: 'outra-colecao-id',
      slug: 'outra-colecao',
    });

    const result = await updateUseCase.execute(ctx, collectionId, {
      ...baseInput,
      slug: 'outra-colecao',
      itemIds: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });
});
