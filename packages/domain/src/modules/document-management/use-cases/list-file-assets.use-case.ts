import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { FileAsset } from '../entities/file-asset.entity';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';

export interface ListFileAssetsDeps {
  fileAssetRepository: IFileAssetRepository;
}

/** Listagem administrativa (inclui rascunhos) — requer `file:read`. */
export class ListAllFileAssetsUseCase {
  constructor(private readonly deps: ListFileAssetsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<FileAsset>> {
    requirePermission(ctx, 'file:read');
    return this.deps.fileAssetRepository.listAll(ctx.tenantId, page);
  }
}

/** Arquivos publicados de uma categoria — requer `file:read` (Área do Irmão). */
export class ListPublishedFilesByCategoryUseCase {
  constructor(private readonly deps: ListFileAssetsDeps) {}

  async execute(
    ctx: AuthContext,
    categoriaId: string,
    page: PageRequest,
  ): Promise<PageResult<FileAsset>> {
    requirePermission(ctx, 'file:read');
    return this.deps.fileAssetRepository.listPublishedByCategory(ctx.tenantId, categoriaId, page);
  }
}
