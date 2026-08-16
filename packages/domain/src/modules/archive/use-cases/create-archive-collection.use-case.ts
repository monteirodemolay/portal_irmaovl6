import type { ArchiveCollectionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';

export interface CreateArchiveCollectionDeps {
  archiveCollectionRepository: IArchiveCollectionRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateArchiveCollectionUseCase {
  constructor(private readonly deps: CreateArchiveCollectionDeps) {}

  async execute(
    ctx: AuthContext,
    input: ArchiveCollectionFormValues,
  ): Promise<Result<ArchiveCollection>> {
    requirePermission(ctx, 'archiveCollection:create');

    const existing = await this.deps.archiveCollectionRepository.findBySlugAndTenant(
      ctx.tenantId,
      input.slug,
    );
    if (existing) {
      return err(new ConflictError(`Já existe uma coleção com o slug "${input.slug}".`));
    }

    const now = this.deps.clock.now();
    const collection: ArchiveCollection = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      itemIds: [],
      publicado: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveCollectionRepository.create(collection);

    return ok(collection);
  }
}
