import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface RestoreArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
}

/** Lixeira do Acervo — restauração, limpa `deletedAt`. */
export class RestoreArchiveItemUseCase {
  constructor(private readonly deps: RestoreArchiveItemDeps) {}

  async execute(ctx: AuthContext, archiveItemId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveItem:delete');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    await this.deps.archiveItemRepository.restore(archiveItemId, ctx.uid);

    return ok(undefined);
  }
}
