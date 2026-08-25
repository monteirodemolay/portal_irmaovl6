import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Publication } from '../entities/publication.entity';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface ApprovePublicationDeps {
  publicationRepository: IPublicationRepository;
  clock: IClock;
}

/** Aprovação humana antes de qualquer publicação externa (regra indispensável do pacote). */
export class ApprovePublicationUseCase {
  constructor(private readonly deps: ApprovePublicationDeps) {}

  async execute(ctx: AuthContext, publicationId: string): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const current = await this.deps.publicationRepository.findById(publicationId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Publication', publicationId));
    }
    if (current.publicacaoStatus !== 'awaiting_approval') {
      return err(new ConflictError('Só publicações aguardando aprovação podem ser aprovadas.'));
    }
    if (current.assets.length === 0) {
      return err(new ConflictError('Gere ao menos uma arte antes de aprovar.'));
    }

    const now = this.deps.clock.now();
    const updated: Publication = {
      ...current,
      publicacaoStatus: 'ready',
      approvedBy: ctx.uid,
      approvedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationRepository.update(updated);

    return ok(updated);
  }
}
