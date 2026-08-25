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
 * Edita título, campos da arte, legenda e texto de WhatsApp — inclusive
 * depois de publicada: um erro de digitação (nome, data, local) só é
 * percebido às vezes depois que a arte já foi ao ar, e o Administrador
 * precisa corrigir e regerar a imagem sem precisar recriar a publicação do
 * zero. Só `archived` é estado final de verdade (publicação arquivada some
 * da lista principal e não deve mais ser mexida).
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
    if (current.publicacaoStatus === 'archived') {
      return err(new ConflictError('Publicações arquivadas não podem ser editadas.'));
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
