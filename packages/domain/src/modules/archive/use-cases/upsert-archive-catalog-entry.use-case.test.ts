import { describe, expect, it } from 'vitest';
import type { ArchiveCatalogEntryFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveCatalogEntryRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { UpsertArchiveCatalogEntryUseCase } from './upsert-archive-catalog-entry.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCatalog:manage'],
};

const input: ArchiveCatalogEntryFormValues = {
  origemId: 'file_1',
  tituloCurado: 'Ata de Fundação — 1926',
  contextoHistorico: 'Registro histórico da fundação da Loja.',
  tags: ['fundação', '1926'],
};

function buildUseCase() {
  const archiveCatalogEntryRepository = new InMemoryArchiveCatalogEntryRepository();
  const useCase = new UpsertArchiveCatalogEntryUseCase({
    archiveCatalogEntryRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveCatalogEntryRepository };
}

describe('UpsertArchiveCatalogEntryUseCase', () => {
  it('cria a ficha como rascunho na primeira vez', async () => {
    const { useCase, archiveCatalogEntryRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(false);
    expect(result.value.tags).toEqual(['fundação', '1926']);

    const stored = await archiveCatalogEntryRepository.findByOrigemId('t1', 'file_1');
    expect(stored).not.toBeNull();
  });

  it('atualiza a ficha existente sem duplicar nem alterar o status de publicação', async () => {
    const { useCase, archiveCatalogEntryRepository } = buildUseCase();
    const created = await useCase.execute(ctx, input);
    if (!created.ok) throw new Error('setup falhou');
    await archiveCatalogEntryRepository.update({ ...created.value, publicado: true });

    const result = await useCase.execute(ctx, { ...input, tituloCurado: 'Novo título' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(created.value.id);
    expect(result.value.tituloCurado).toBe('Novo título');
    expect(result.value.publicado).toBe(true);

    const all = await archiveCatalogEntryRepository.listByTenant('t1');
    expect(all).toHaveLength(1);
  });

  it('lança ForbiddenError sem archiveCatalog:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
