import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import type { IArchiveCatalogEntryRepository } from '../repositories/archive-catalog-entry.repository';

export interface PublishArchiveCatalogEntryDeps {
  archiveCatalogEntryRepository: IArchiveCatalogEntryRepository;
  clock: IClock;
}

export class PublishArchiveCatalogEntryUseCase {
  constructor(private readonly deps: PublishArchiveCatalogEntryDeps) {}

  async execute(
    ctx: AuthContext,
    entryId: string,
    publicar: boolean,
  ): Promise<Result<ArchiveCatalogEntry>> {
    requirePermission(ctx, 'archiveCatalog:publish');

    const current = await this.deps.archiveCatalogEntryRepository.findById(entryId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveCatalogEntry', entryId));
    }

    const updated: ArchiveCatalogEntry = {
      ...current,
      publicado: publicar,
      status: publicar ? 'active' : 'draft',
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveCatalogEntryRepository.update(updated);

    return ok(updated);
  }
}
