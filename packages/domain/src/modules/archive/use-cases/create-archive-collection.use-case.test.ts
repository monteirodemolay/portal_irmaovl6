import { describe, expect, it } from 'vitest';
import type { ArchiveCollectionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveCollectionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveCollectionUseCase } from './create-archive-collection.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCollection:create'],
};

const input: ArchiveCollectionFormValues = {
  titulo: 'Sessões Magnas de 2026',
  slug: 'sessoes-magnas-2026',
  descricaoEditorial: 'Registros das sessões magnas do ano.',
  curadoPor: 'Secretaria',
  capaUrl: null,
  ordem: 0,
};

function buildUseCase() {
  const archiveCollectionRepository = new InMemoryArchiveCollectionRepository();
  const useCase = new CreateArchiveCollectionUseCase({
    archiveCollectionRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveCollectionRepository };
}

describe('CreateArchiveCollectionUseCase', () => {
  it('cria a coleção como rascunho, sem itens', async () => {
    const { useCase, archiveCollectionRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Sessões Magnas de 2026');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.publicado).toBe(false);
    expect(result.value.itemIds).toEqual([]);

    const stored = await archiveCollectionRepository.findById(result.value.id);
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

  it('lança ForbiddenError quando falta a permissão archiveCollection:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
