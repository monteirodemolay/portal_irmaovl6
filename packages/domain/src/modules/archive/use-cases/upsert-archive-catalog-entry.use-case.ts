import type { ArchiveCatalogEntryFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import type { IArchiveCatalogEntryRepository } from '../repositories/archive-catalog-entry.repository';

export interface UpsertArchiveCatalogEntryDeps {
  archiveCatalogEntryRepository: IArchiveCatalogEntryRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cria ou atualiza a ficha de catalogação de um item (1:1 por `origemId`) —
 * nunca migra nem duplica o registro de origem, só complementa. Entradas
 * novas nascem como rascunho (`publicado: false`); publicar é uma ação
 * separada (`PublishArchiveCatalogEntryUseCase`).
 */
export class UpsertArchiveCatalogEntryUseCase {
  constructor(private readonly deps: UpsertArchiveCatalogEntryDeps) {}

  async execute(
    ctx: AuthContext,
    input: ArchiveCatalogEntryFormValues,
  ): Promise<Result<ArchiveCatalogEntry>> {
    requirePermission(ctx, 'archiveCatalog:manage');

    const now = this.deps.clock.now();
    const existing = await this.deps.archiveCatalogEntryRepository.findByOrigemId(
      ctx.tenantId,
      input.origemId,
    );

    if (existing) {
      const updated: ArchiveCatalogEntry = {
        ...existing,
        tituloCurado: input.tituloCurado,
        contextoHistorico: input.contextoHistorico,
        tags: input.tags,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.archiveCatalogEntryRepository.update(updated);
      return ok(updated);
    }

    const created: ArchiveCatalogEntry = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      origemId: input.origemId,
      tituloCurado: input.tituloCurado,
      contextoHistorico: input.contextoHistorico,
      tags: input.tags,
      publicado: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveCatalogEntryRepository.create(created);
    return ok(created);
  }
}
