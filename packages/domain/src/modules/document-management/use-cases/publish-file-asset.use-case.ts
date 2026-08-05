import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { FileAsset } from '../entities/file-asset.entity';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';

export interface PublishFileAssetDeps {
  fileAssetRepository: IFileAssetRepository;
  clock: IClock;
}

export class PublishFileAssetUseCase {
  constructor(private readonly deps: PublishFileAssetDeps) {}

  async execute(ctx: AuthContext, fileId: string, publicar: boolean): Promise<Result<FileAsset>> {
    requirePermission(ctx, 'file:update');

    const current = await this.deps.fileAssetRepository.findById(fileId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('FileAsset', fileId));
    }

    const now = this.deps.clock.now();
    const updated: FileAsset = {
      ...current,
      publicado: publicar,
      dataPublicacao: publicar ? (current.dataPublicacao ?? now) : current.dataPublicacao,
      status: publicar ? 'active' : 'draft',
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.fileAssetRepository.update(updated);

    return ok(updated);
  }
}
