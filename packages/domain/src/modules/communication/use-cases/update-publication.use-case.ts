import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Publication } from '../entities/publication.entity';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface UpdatePublicationInput {
  title: string;
  fields: Record<string, string>;
  caption: string | null;
  whatsappText: string | null;
  scheduledFor: Date | null;
}

export interface UpdatePublicationDeps {
  publicationRepository: IPublicationRepository;
  clock: IClock;
}

/**
 * Edita título, campos da arte, legenda e texto de WhatsApp — só antes da
 * publicação (`published`/`archived` são estados finais, editar depois não
 * corrigiria nada que já foi pro ar fora do Portal).
 */
export class UpdatePublicationUseCase {
  constructor(private readonly deps: UpdatePublicationDeps) {}

  async execute(
    ctx: AuthContext,
    publicationId: string,
    input: UpdatePublicationInput,
  ): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const current = await this.deps.publicationRepository.findById(publicationId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Publication', publicationId));
    }
    if (current.publicacaoStatus === 'published' || current.publicacaoStatus === 'archived') {
      return err(
        new ConflictError('Publicações já publicadas ou arquivadas não podem ser editadas.'),
      );
    }

    const updated: Publication = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.publicationRepository.update(updated);

    return ok(updated);
  }
}
