import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ConstellationView } from '../entities/constellation-view.entity';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';

export interface GetConstellationViewDeps {
  constellationViewRepository: IConstellationViewRepository;
}

/**
 * Abre um quadro salvo — o dono sempre pode; qualquer outro Irmão com
 * `archiveRelation:read` só pode se `visibility: 'shared'` (link
 * compartilhado, só-leitura — quem abre nunca pode salvar por cima do
 * quadro de outra pessoa, ver `UpdateConstellationViewUseCase`).
 */
export class GetConstellationViewUseCase {
  constructor(private readonly deps: GetConstellationViewDeps) {}

  async execute(ctx: AuthContext, viewId: string): Promise<Result<ConstellationView>> {
    requirePermission(ctx, 'archiveRelation:read');

    const view = await this.deps.constellationViewRepository.findById(viewId);
    if (!view || view.tenantId !== ctx.tenantId || view.deletedAt !== null) {
      return err(new NotFoundError('ConstellationView', viewId));
    }
    if (view.ownerId !== ctx.uid && view.visibility !== 'shared') {
      return err(new ForbiddenError('dono do quadro'));
    }

    return ok(view);
  }
}
