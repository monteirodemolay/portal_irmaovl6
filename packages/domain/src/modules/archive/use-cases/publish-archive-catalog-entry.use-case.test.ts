import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveCatalogEntryRepository } from '../../../test/fakes';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import { PublishArchiveCatalogEntryUseCase } from './publish-archive-catalog-entry.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCatalog:manage'],
};

function makeEntry(overrides: Partial<ArchiveCatalogEntry> = {}): ArchiveCatalogEntry {
  return {
    id: 'entry-1',
    tenantId: 't1',
    origemId: 'file_1',
    tituloCurado: null,
    contextoHistorico: 'Contexto.',
    tags: [],
    publicado: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveCatalogEntryRepository = new InMemoryArchiveCatalogEntryRepository();
  const useCase = new PublishArchiveCatalogEntryUseCase({
    archiveCatalogEntryRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveCatalogEntryRepository };
}

describe('PublishArchiveCatalogEntryUseCase', () => {
  it('publica a ficha', async () => {
    const { useCase, archiveCatalogEntryRepository } = buildUseCase();
    await archiveCatalogEntryRepository.create(makeEntry());

    const result = await useCase.execute(ctx, 'entry-1', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(true);
  });

  it('retorna NotFoundError para ficha inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'ghost', true);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
