import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface RestoreArchiveMediaDeps {
  archiveMediaRepository: IArchiveMediaRepository;
}

/** Lixeira por mídia individual — restauração, limpa `deletedAt` (Fase 3). */
export class RestoreArchiveMediaUseCase {
  constructor(private readonly deps: RestoreArchiveMediaDeps) {}

  async execute(ctx: AuthContext, archiveMediaId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveMedia:delete');

    const media = await this.deps.archiveMediaRepository.findById(archiveMediaId);
    if (!media || media.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveMedia', archiveMediaId));
    }

    await this.deps.archiveMediaRepository.restore(archiveMediaId, ctx.uid);

    return ok(undefined);
  }
}
