import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface SoftDeleteArchiveMediaDeps {
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Lixeira por mídia individual — Fase 3 (docs/architecture/11-acervo-vl6.md
 * §11.6). Distinta de `SoftDeleteArchiveItemUseCase` (que move o
 * `ArchiveItem` inteiro para a lixeira): aqui só UMA `ArchiveMedia` vai para
 * a lixeira, o item e as demais mídias seguem intactos. Mesmo padrão de
 * soft delete (`deletedAt`), nunca exclusão física.
 */
export class SoftDeleteArchiveMediaUseCase {
  constructor(private readonly deps: SoftDeleteArchiveMediaDeps) {}

  async execute(ctx: AuthContext, archiveMediaId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveMedia:delete');

    const media = await this.deps.archiveMediaRepository.findById(archiveMediaId);
    if (!media || media.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveMedia', archiveMediaId));
    }

    await this.deps.archiveMediaRepository.softDelete(
      archiveMediaId,
      this.deps.clock.now(),
      ctx.uid,
    );

    return ok(undefined);
  }
}
