import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface SetArchiveItemCoverDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Marca uma `ArchiveMedia` como capa do `ArchiveItem` — Fase 1 da
 * Fundação do Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5).
 * Garante unicidade: desmarca `isCover` de qualquer outra mídia do mesmo
 * item antes de marcar a nova, e atualiza `ArchiveItem.capaMediaId`.
 */
export class SetArchiveItemCoverUseCase {
  constructor(private readonly deps: SetArchiveItemCoverDeps) {}

  async execute(
    ctx: AuthContext,
    archiveItemId: string,
    archiveMediaId: string,
  ): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:update');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    const media = await this.deps.archiveMediaRepository.findById(archiveMediaId);
    if (!media || media.tenantId !== ctx.tenantId || media.archiveItemId !== archiveItemId) {
      return err(new NotFoundError('ArchiveMedia', archiveMediaId));
    }

    const now = this.deps.clock.now();
    const siblings = await this.deps.archiveMediaRepository.findByArchiveItemId(archiveItemId);
    await Promise.all(
      siblings
        .filter((sibling) => sibling.isCover && sibling.id !== archiveMediaId)
        .map((sibling) =>
          this.deps.archiveMediaRepository.update({
            ...sibling,
            isCover: false,
            updatedAt: now,
            updatedBy: ctx.uid,
          }),
        ),
    );

    if (!media.isCover) {
      await this.deps.archiveMediaRepository.update({
        ...media,
        isCover: true,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    const updatedItem: ArchiveItem = {
      ...item,
      capaMediaId: archiveMediaId,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.archiveItemRepository.update(updatedItem);

    return ok(updatedItem);
  }
}
