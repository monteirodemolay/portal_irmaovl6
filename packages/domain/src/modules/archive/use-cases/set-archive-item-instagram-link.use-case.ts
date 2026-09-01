import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface SetArchiveItemInstagramLinkDeps {
  archiveItemRepository: IArchiveItemRepository;
  clock: IClock;
}

/**
 * Registra (ou limpa, com `null`) o link do post no Instagram onde este
 * item também foi divulgado — puro registro institucional, nunca publica
 * nada na rede social. Passo "Publicação" da Central de Publicação, depois
 * que o item já está publicado no Portal.
 */
export class SetArchiveItemInstagramLinkUseCase {
  constructor(private readonly deps: SetArchiveItemInstagramLinkDeps) {}

  async execute(
    ctx: AuthContext,
    archiveItemId: string,
    instagramUrl: string | null,
  ): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:update');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    const now = this.deps.clock.now();
    const updated: ArchiveItem = {
      ...item,
      instagramUrl,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.archiveItemRepository.update(updated);

    return ok(updated);
  }
}
