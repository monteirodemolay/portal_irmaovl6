import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface UnpublishArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  clock: IClock;
}

/**
 * Retira um `ArchiveItem` publicado de circulação — Fase 3
 * (docs/architecture/11-acervo-vl6.md §11.6). Escolha simples deliberada:
 * volta para `oculto` (não `rascunho`), porque o item já passou pelo
 * checklist de publicação uma vez — `oculto` preserva isso e só some da
 * navegação pública, igual ao par publish/unpublish já usado por
 * `PublishArchiveCollectionUseCase` nos módulos irmãos. As `ArchiveMedia`
 * do item NÃO são revertidas para rascunho: permanecem `publicado`, prontas
 * para reaparecer assim que o item for publicado de novo.
 */
export class UnpublishArchiveItemUseCase {
  constructor(private readonly deps: UnpublishArchiveItemDeps) {}

  async execute(ctx: AuthContext, archiveItemId: string): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:publish');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    if (item.publicacaoStatus !== 'publicado') {
      return err(new ValidationError('Só é possível retirar de publicação um item publicado.'));
    }

    const updatedItem: ArchiveItem = {
      ...item,
      publicacaoStatus: 'oculto',
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveItemRepository.update(updatedItem);

    return ok(updatedItem);
  }
}
