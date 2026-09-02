import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ConstellationViewRevision } from '../entities/constellation-view.entity';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';
import type { IConstellationViewRevisionRepository } from '../repositories/constellation-view-revision.repository';

export interface ListConstellationViewRevisionsDeps {
  constellationViewRepository: IConstellationViewRepository;
  constellationViewRevisionRepository: IConstellationViewRevisionRepository;
}

/** Histórico de versões de um quadro — só o dono vê (mesmo quadro compartilhado só-leitura não expõe o histórico). */
export class ListConstellationViewRevisionsUseCase {
  constructor(private readonly deps: ListConstellationViewRevisionsDeps) {}

  async execute(ctx: AuthContext, viewId: string): Promise<Result<ConstellationViewRevision[]>> {
    requirePermission(ctx, 'archiveRelation:read');

    const view = await this.deps.constellationViewRepository.findById(viewId);
    if (!view || view.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ConstellationView', viewId));
    }
    if (view.ownerId !== ctx.uid) {
      return err(new ForbiddenError('dono do quadro'));
    }

    const revisions = await this.deps.constellationViewRevisionRepository.listByView(
      ctx.tenantId,
      viewId,
    );
    return ok(revisions.sort((a, b) => b.version - a.version));
  }
}
