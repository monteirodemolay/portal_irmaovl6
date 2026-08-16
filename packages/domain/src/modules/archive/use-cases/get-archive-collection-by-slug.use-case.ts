import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../repositories/archive-collection.repository';

export interface GetArchiveCollectionBySlugDeps {
  archiveCollectionRepository: IArchiveCollectionRepository;
}

/**
 * Detalhe de coleção por slug — `/acervo/colecoes/[slug]`. Retorna `null`
 * tanto se o slug não existir quanto se a coleção não estiver publicada,
 * sem distinguir os dois casos (mesma cautela de `GetPublicMemberProfileUseCase`).
 */
export class GetArchiveCollectionBySlugUseCase {
  constructor(private readonly deps: GetArchiveCollectionBySlugDeps) {}

  async execute(ctx: AuthContext, slug: string): Promise<ArchiveCollection | null> {
    requirePermission(ctx, 'archiveCollection:read');

    const collection = await this.deps.archiveCollectionRepository.findBySlugAndTenant(
      ctx.tenantId,
      slug,
    );
    if (!collection || !collection.publicado) return null;

    return collection;
  }
}
