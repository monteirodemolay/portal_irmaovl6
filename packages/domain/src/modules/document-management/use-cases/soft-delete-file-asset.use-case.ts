import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';

export interface SoftDeleteFileAssetDeps {
  fileAssetRepository: IFileAssetRepository;
  clock: IClock;
}

export class SoftDeleteFileAssetUseCase {
  constructor(private readonly deps: SoftDeleteFileAssetDeps) {}

  async execute(ctx: AuthContext, fileId: string): Promise<Result<void>> {
    requirePermission(ctx, 'file:delete');

    const file = await this.deps.fileAssetRepository.findById(fileId);
    if (!file || file.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('FileAsset', fileId));
    }

    const now = this.deps.clock.now();
    await this.deps.fileAssetRepository.update({
      ...file,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
