import type { FileAssetFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { FileAsset } from '../entities/file-asset.entity';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';

export interface UpdateFileAssetDeps {
  fileAssetRepository: IFileAssetRepository;
  clock: IClock;
}

export class UpdateFileAssetUseCase {
  constructor(private readonly deps: UpdateFileAssetDeps) {}

  async execute(
    ctx: AuthContext,
    fileId: string,
    input: FileAssetFormValues,
  ): Promise<Result<FileAsset>> {
    requirePermission(ctx, 'file:update');

    const current = await this.deps.fileAssetRepository.findById(fileId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('FileAsset', fileId));
    }

    const isNewUpload = input.urlArquivo !== current.urlArquivo;
    const updated: FileAsset = {
      ...current,
      ...input,
      versao: isNewUpload ? current.versao + 1 : current.versao,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.fileAssetRepository.update(updated);

    return ok(updated);
  }
}
