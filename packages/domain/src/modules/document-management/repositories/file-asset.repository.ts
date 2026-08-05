import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { FileAsset } from '../entities/file-asset.entity';

export interface IFileAssetRepository {
  findById(id: string): Promise<FileAsset | null>;
  listPublishedByCategory(
    tenantId: string,
    categoriaId: string,
    page: PageRequest,
  ): Promise<PageResult<FileAsset>>;
  listAll(tenantId: string, page: PageRequest): Promise<PageResult<FileAsset>>;
  create(file: FileAsset): Promise<void>;
  update(file: FileAsset): Promise<void>;
  /** Incremento atômico — nunca via read-modify-write (docs/architecture/06 §6.3). */
  incrementDownloads(id: string): Promise<void>;
  incrementViews(id: string): Promise<void>;
}
