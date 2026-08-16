import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import type { IArchiveContributionRepository } from '../repositories/archive-contribution.repository';

export interface ModerateArchiveContributionDeps {
  archiveContributionRepository: IArchiveContributionRepository;
  clock: IClock;
}

/**
 * Aprova ou rejeita uma contribuição — nunca soft-deleta (diferente de
 * `ModerateNewsCommentUseCase`): o Irmão precisa continuar vendo o próprio
 * envio e, se rejeitado, o motivo, em "Minhas contribuições". Aprovar não
 * cria automaticamente nenhum registro em `FileAsset`/`GalleryMedia`.
 */
export class ModerateArchiveContributionUseCase {
  constructor(private readonly deps: ModerateArchiveContributionDeps) {}

  async execute(
    ctx: AuthContext,
    contributionId: string,
    aprovar: boolean,
    motivoRejeicao: string | null,
  ): Promise<Result<ArchiveContribution>> {
    requirePermission(ctx, 'archiveContribution:manage');

    const contribution = await this.deps.archiveContributionRepository.findById(contributionId);
    if (!contribution || contribution.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveContribution', contributionId));
    }

    const now = this.deps.clock.now();
    const updated: ArchiveContribution = {
      ...contribution,
      moderacaoStatus: aprovar ? 'aprovada' : 'rejeitada',
      motivoRejeicao: aprovar ? null : motivoRejeicao,
      moderadoPor: ctx.uid,
      moderadoEm: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.archiveContributionRepository.update(updated);
    return ok(updated);
  }
}
