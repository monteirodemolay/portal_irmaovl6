import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';

export interface ListArchiveCollectionsDeps {
  archiveCollectionRepository: IArchiveCollectionRepository;
}

/** Todas as coleções do tenant, publicadas ou não — uso administrativo. */
export class ListArchiveCollectionsUseCase {
  constructor(private readonly deps: ListArchiveCollectionsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveCollection[]> {
    requirePermission(ctx, 'archiveCollection:read');
    return this.deps.archiveCollectionRepository.listByTenant(ctx.tenantId);
  }
}
