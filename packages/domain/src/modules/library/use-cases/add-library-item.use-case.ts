import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IFileAssetRepository } from '../../document-management/repositories/file-asset.repository';
import type { LibraryItem } from '../entities/library-item.entity';
import type { ILibraryItemRepository } from '../repositories/library-item.repository';

export interface AddLibraryItemInput {
  fileId: string;
  categoriaId: string;
  subcategoriaId: string | null;
  permiteLeituraOnline: boolean;
}

export interface AddLibraryItemDeps {
  libraryItemRepository: ILibraryItemRepository;
  fileAssetRepository: IFileAssetRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cataloga um `FileAsset` já existente na Biblioteca — nunca duplica o
 * binário, só a camada de curadoria (docs/architecture/06 §6.3).
 */
export class AddLibraryItemUseCase {
  constructor(private readonly deps: AddLibraryItemDeps) {}

  async execute(ctx: AuthContext, input: AddLibraryItemInput): Promise<Result<LibraryItem>> {
    requirePermission(ctx, 'libraryItem:create');

    const file = await this.deps.fileAssetRepository.findById(input.fileId);
    if (!file || file.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('FileAsset', input.fileId));
    }

    const now = this.deps.clock.now();
    const item: LibraryItem = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      contagemDownloads: 0,
      contagemVisualizacoes: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.libraryItemRepository.create(item);

    return ok(item);
  }
}
