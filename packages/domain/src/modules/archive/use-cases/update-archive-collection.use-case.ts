import type { ArchiveCollectionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';

export interface UpdateArchiveCollectionDeps {
  archiveCollectionRepository: IArchiveCollectionRepository;
  clock: IClock;
}

export interface UpdateArchiveCollectionInput extends ArchiveCollectionFormValues {
  itemIds: string[];
}

export class UpdateArchiveCollectionUseCase {
  constructor(private readonly deps: UpdateArchiveCollectionDeps) {}

  async execute(
    ctx: AuthContext,
    collectionId: string,
    input: UpdateArchiveCollectionInput,
  ): Promise<Result<ArchiveCollection>> {
    requirePermission(ctx, 'archiveCollection:update');

    const current = await this.deps.archiveCollectionRepository.findById(collectionId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveCollection', collectionId));
    }

    if (input.slug !== current.slug) {
      const existing = await this.deps.archiveCollectionRepository.findBySlugAndTenant(
        ctx.tenantId,
        input.slug,
      );
      if (existing && existing.id !== collectionId) {
        return err(new ConflictError(`Já existe uma coleção com o slug "${input.slug}".`));
      }
    }

    const updated: ArchiveCollection = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveCollectionRepository.update(updated);

    return ok(updated);
  }
}
