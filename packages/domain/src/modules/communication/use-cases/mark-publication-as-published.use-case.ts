import type { PublicationChannel } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Publication } from '../entities/publication.entity';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface MarkPublicationAsPublishedDeps {
  publicationRepository: IPublicationRepository;
  clock: IClock;
}

/**
 * O Chanceler confirma manualmente que baixou/compartilhou e publicou a
 * arte fora do Portal — este projeto nunca automatiza a publicação em si
 * no Instagram/WhatsApp (regra indispensável do pacote), só registra que
 * ela aconteceu, quem fez e em quais canais.
 */
export class MarkPublicationAsPublishedUseCase {
  constructor(private readonly deps: MarkPublicationAsPublishedDeps) {}

  async execute(
    ctx: AuthContext,
    publicationId: string,
    channels: PublicationChannel[],
  ): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const current = await this.deps.publicationRepository.findById(publicationId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Publication', publicationId));
    }
    if (current.publicacaoStatus !== 'ready') {
      return err(new ConflictError('Só publicações prontas podem ser marcadas como publicadas.'));
    }

    const now = this.deps.clock.now();
    const updated: Publication = {
      ...current,
      publicacaoStatus: 'published',
      channels,
      publishedBy: ctx.uid,
      publishedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationRepository.update(updated);

    return ok(updated);
  }
}
