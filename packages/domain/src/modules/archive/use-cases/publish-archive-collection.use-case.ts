import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';

export interface PublishArchiveCollectionDeps {
  archiveCollectionRepository: IArchiveCollectionRepository;
  clock: IClock;
}

export class PublishArchiveCollectionUseCase {
  constructor(private readonly deps: PublishArchiveCollectionDeps) {}

  async execute(
    ctx: AuthContext,
    collectionId: string,
    publicar: boolean,
  ): Promise<Result<ArchiveCollection>> {
    requirePermission(ctx, 'archiveCollection:publish');

    const current = await this.deps.archiveCollectionRepository.findById(collectionId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveCollection', collectionId));
    }

    const updated: ArchiveCollection = {
      ...current,
      publicado: publicar,
      status: publicar ? 'active' : 'draft',
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveCollectionRepository.update(updated);

    return ok(updated);
  }
}
