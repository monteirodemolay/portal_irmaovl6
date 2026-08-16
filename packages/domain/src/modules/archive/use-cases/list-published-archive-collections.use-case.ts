import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';

export interface ListPublishedArchiveCollectionsDeps {
  archiveCollectionRepository: IArchiveCollectionRepository;
}

/** Coleções publicadas — uso do Irmão em `/acervo/colecoes` e `/acervo/descobrir`. */
export class ListPublishedArchiveCollectionsUseCase {
  constructor(private readonly deps: ListPublishedArchiveCollectionsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveCollection[]> {
    requirePermission(ctx, 'archiveCollection:read');
    return this.deps.archiveCollectionRepository.listPublishedByTenant(ctx.tenantId);
  }
}
