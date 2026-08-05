import type { FileAssetFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { FileAsset } from '../entities/file-asset.entity';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';

export interface CreateFileAssetDeps {
  fileAssetRepository: IFileAssetRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Registra os metadados de um arquivo já enviado ao Storage pela camada de
 * apresentação (o binário em si não passa pelo domínio — ver
 * docs/architecture/06-regras-negocio.md §6.3). Nasce como rascunho
 * (`publicado: false`); publicar é uma ação separada.
 */
export class CreateFileAssetUseCase {
  constructor(private readonly deps: CreateFileAssetDeps) {}

  async execute(ctx: AuthContext, input: FileAssetFormValues): Promise<Result<FileAsset>> {
    requirePermission(ctx, 'file:create');

    const now = this.deps.clock.now();
    const file: FileAsset = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      versao: 1,
      publicado: false,
      contagemDownloads: 0,
      contagemVisualizacoes: 0,
      dataPublicacao: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.fileAssetRepository.create(file);

    return ok(file);
  }
}
