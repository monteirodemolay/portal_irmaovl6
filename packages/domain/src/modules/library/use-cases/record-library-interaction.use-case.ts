import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IFileAssetRepository } from '../../document-management/repositories/file-asset.repository';
import type { ILibraryItemRepository } from '../repositories/library-item.repository';

export interface RecordLibraryInteractionDeps {
  libraryItemRepository: ILibraryItemRepository;
  fileAssetRepository: IFileAssetRepository;
}

export class RecordLibraryViewUseCase {
  constructor(private readonly deps: RecordLibraryInteractionDeps) {}

  async execute(ctx: AuthContext, libraryItemId: string): Promise<Result<void>> {
    requirePermission(ctx, 'libraryItem:read');

    const item = await this.deps.libraryItemRepository.findById(libraryItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('LibraryItem', libraryItemId));
    }
    if (!item.permiteLeituraOnline) {
      return err(new ForbiddenError('libraryItem:read-online'));
    }

    await this.deps.libraryItemRepository.incrementViews(libraryItemId);
    return ok(undefined);
  }
}

export class RecordLibraryDownloadUseCase {
  constructor(private readonly deps: RecordLibraryInteractionDeps) {}

  async execute(ctx: AuthContext, libraryItemId: string): Promise<Result<void>> {
    requirePermission(ctx, 'libraryItem:read');

    const item = await this.deps.libraryItemRepository.findById(libraryItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('LibraryItem', libraryItemId));
    }

    const file = await this.deps.fileAssetRepository.findById(item.fileId);
    if (!file || !file.permitirDownload) {
      return err(new ForbiddenError('libraryItem:download'));
    }

    await this.deps.libraryItemRepository.incrementDownloads(libraryItemId);
    return ok(undefined);
  }
}
