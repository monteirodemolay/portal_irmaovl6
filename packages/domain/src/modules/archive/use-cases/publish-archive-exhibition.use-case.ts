import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../repositories/archive-exhibition.repository';

export interface PublishArchiveExhibitionDeps {
  archiveExhibitionRepository: IArchiveExhibitionRepository;
  clock: IClock;
}

export class PublishArchiveExhibitionUseCase {
  constructor(private readonly deps: PublishArchiveExhibitionDeps) {}

  async execute(
    ctx: AuthContext,
    exhibitionId: string,
    publicar: boolean,
  ): Promise<Result<ArchiveExhibition>> {
    requirePermission(ctx, 'archiveExhibition:publish');

    const current = await this.deps.archiveExhibitionRepository.findById(exhibitionId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveExhibition', exhibitionId));
    }

    const updated: ArchiveExhibition = {
      ...current,
      publicado: publicar,
      status: publicar ? 'active' : 'draft',
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveExhibitionRepository.update(updated);

    return ok(updated);
  }
}
