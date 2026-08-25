import type { PublicationStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Publication } from '../entities/publication.entity';
import type { IPublicationRepository } from '../repositories/publication.repository';

/** Alimenta as 4 abas do painel (Fila/Prontas/Publicadas/Arquivadas) — `null` traz todas as não excluídas. */
export class ListPublicationsUseCase {
  constructor(private readonly deps: { publicationRepository: IPublicationRepository }) {}

  async execute(ctx: AuthContext, statuses: PublicationStatus[] | null): Promise<Publication[]> {
    requirePermission(ctx, 'communication:manage');
    return this.deps.publicationRepository.listByStatus(ctx.tenantId, statuses);
  }
}
