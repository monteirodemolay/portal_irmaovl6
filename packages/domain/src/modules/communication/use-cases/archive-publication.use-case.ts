import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Publication } from '../entities/publication.entity';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface ArchivePublicationDeps {
  publicationRepository: IPublicationRepository;
  clock: IClock;
}

export class ArchivePublicationUseCase {
  constructor(private readonly deps: ArchivePublicationDeps) {}

  async execute(ctx: AuthContext, publicationId: string): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const current = await this.deps.publicationRepository.findById(publicationId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Publication', publicationId));
    }

    const now = this.deps.clock.now();
    const updated: Publication = {
      ...current,
      publicacaoStatus: 'archived',
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationRepository.update(updated);

    return ok(updated);
  }
}
