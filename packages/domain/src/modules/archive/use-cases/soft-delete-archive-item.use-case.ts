import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface SoftDeleteArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  clock: IClock;
}

/** Lixeira do Acervo — soft delete, nunca exclusão física. */
export class SoftDeleteArchiveItemUseCase {
  constructor(private readonly deps: SoftDeleteArchiveItemDeps) {}

  async execute(ctx: AuthContext, archiveItemId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveItem:delete');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    await this.deps.archiveItemRepository.softDelete(archiveItemId, this.deps.clock.now(), ctx.uid);

    return ok(undefined);
  }
}
