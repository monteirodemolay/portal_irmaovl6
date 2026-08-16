import { describe, expect, it } from 'vitest';
import type { ArchiveCollectionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveCollectionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveCollectionUseCase } from './create-archive-collection.use-case';
import { PublishArchiveCollectionUseCase } from './publish-archive-collection.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCollection:manage'],
};

const input: ArchiveCollectionFormValues = {
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
  const publishUseCase = new PublishArchiveCollectionUseCase({
    archiveCollectionRepository,
    clock,
  });

  const created = await createUseCase.execute(ctx, input);
  if (!created.ok) throw new Error('setup falhou');

  return { archiveCollectionRepository, publishUseCase, collectionId: created.value.id };
}

describe('PublishArchiveCollectionUseCase', () => {
  it('publica a coleção', async () => {
    const { publishUseCase, collectionId, archiveCollectionRepository } = await buildScenario();

    const result = await publishUseCase.execute(ctx, collectionId, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(true);
    expect(result.value.status).toBe('active');

    const stored = await archiveCollectionRepository.findById(collectionId);
    expect(stored?.publicado).toBe(true);
  });

  it('despublica a coleção', async () => {
    const { publishUseCase, collectionId } = await buildScenario();
    await publishUseCase.execute(ctx, collectionId, true);

    const result = await publishUseCase.execute(ctx, collectionId, false);

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
