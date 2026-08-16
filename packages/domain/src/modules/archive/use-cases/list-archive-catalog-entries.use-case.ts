import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import type { IArchiveCatalogEntryRepository } from '../repositories/archive-catalog-entry.repository';

export interface ListArchiveCatalogEntriesDeps {
  archiveCatalogEntryRepository: IArchiveCatalogEntryRepository;
}

/** Todas as fichas de catalogação do tenant — uso administrativo. */
export class ListArchiveCatalogEntriesUseCase {
  constructor(private readonly deps: ListArchiveCatalogEntriesDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveCatalogEntry[]> {
    requirePermission(ctx, 'archiveCatalog:read');
    return this.deps.archiveCatalogEntryRepository.listByTenant(ctx.tenantId);
  }
}
