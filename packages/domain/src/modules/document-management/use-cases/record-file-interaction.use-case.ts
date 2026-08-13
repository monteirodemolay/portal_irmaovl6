import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';

export interface RecordFileInteractionDeps {
  fileAssetRepository: IFileAssetRepository;
}

/** Visualização — sempre permitida a quem pode ler o arquivo. */
export class RecordFileViewUseCase {
  constructor(private readonly deps: RecordFileInteractionDeps) {}

  async execute(ctx: AuthContext, fileId: string): Promise<Result<void>> {
    requirePermission(ctx, 'file:read');

    const file = await this.deps.fileAssetRepository.findById(fileId);
    if (!file || file.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('FileAsset', fileId));
    }

    await this.deps.fileAssetRepository.incrementViews(fileId);
    return ok(undefined);
  }
}

/**
 * Download — bloqueado quando `permitirDownload = false` mesmo com leitura
 * online liberada (docs/architecture/06-regras-negocio.md §6.3).
 */
export class RecordFileDownloadUseCase {
  constructor(private readonly deps: RecordFileInteractionDeps) {}

  async execute(ctx: AuthContext, fileId: string): Promise<Result<void>> {
    requirePermission(ctx, 'file:read');

    const file = await this.deps.fileAssetRepository.findById(fileId);
    if (!file || file.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('FileAsset', fileId));
    }
    if (!file.permitirDownload) {
      return err(new ForbiddenError('file:download'));
    }

    await this.deps.fileAssetRepository.incrementDownloads(fileId);
    return ok(undefined);
  }
}
