import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import type { IArchiveCatalogEntryRepository } from '../repositories/archive-catalog-entry.repository';

export interface GetArchiveCatalogEntryByOrigemIdDeps {
  archiveCatalogEntryRepository: IArchiveCatalogEntryRepository;
}

/**
 * Ficha de catalogação publicada de um item, se existir — usada para
 * enriquecer `/acervo/item/[id]` (`resolveArchiveItem`) sem duplicar nada.
 * Retorna `null` tanto para "nunca catalogado" quanto para "catalogado mas
 * ainda rascunho", sem distinguir os dois casos.
 */
export class GetArchiveCatalogEntryByOrigemIdUseCase {
  constructor(private readonly deps: GetArchiveCatalogEntryByOrigemIdDeps) {}

  async execute(ctx: AuthContext, origemId: string): Promise<ArchiveCatalogEntry | null> {
    requirePermission(ctx, 'archiveCatalog:read');

    const entry = await this.deps.archiveCatalogEntryRepository.findByOrigemId(
      ctx.tenantId,
      origemId,
    );
    if (!entry || !entry.publicado) return null;

    return entry;
  }
}
