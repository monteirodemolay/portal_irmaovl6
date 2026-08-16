import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../repositories/archive-exhibition.repository';

export interface GetArchiveExhibitionBySlugDeps {
  archiveExhibitionRepository: IArchiveExhibitionRepository;
}

/**
 * Detalhe de exposição por slug — `/acervo/exposicoes/[slug]`. Retorna
 * `null` tanto se o slug não existir quanto se a exposição não estiver
 * publicada, sem distinguir os dois casos (mesma cautela de
 * `GetArchiveCollectionBySlugUseCase`).
 */
export class GetArchiveExhibitionBySlugUseCase {
  constructor(private readonly deps: GetArchiveExhibitionBySlugDeps) {}

  async execute(ctx: AuthContext, slug: string): Promise<ArchiveExhibition | null> {
    requirePermission(ctx, 'archiveExhibition:read');

    const exhibition = await this.deps.archiveExhibitionRepository.findBySlugAndTenant(
      ctx.tenantId,
      slug,
    );
    if (!exhibition || !exhibition.publicado) return null;

    return exhibition;
  }
}
