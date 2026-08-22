import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { MediaAsset } from '../entities/media-asset.entity';

export interface IMediaAssetRepository {
  findById(id: string): Promise<MediaAsset | null>;
  findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<MediaAsset>>;
  /** Usado por `RegisterMediaAssetUseCase` para detectar duplicidade por hash dentro do tenant (avisa, não bloqueia). */
  findBySha256(tenantId: string, sha256: string): Promise<MediaAsset | null>;
  create(mediaAsset: MediaAsset): Promise<void>;
  update(mediaAsset: MediaAsset): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
  restore(id: string, updatedBy: string): Promise<void>;
}
