import type { RegisterMediaAssetFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { MediaAsset } from '../entities/media-asset.entity';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';

export interface RegisterMediaAssetDeps {
  mediaAssetRepository: IMediaAssetRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface RegisterMediaAssetOutput {
  mediaAsset: MediaAsset;
  /** Já existe outro `MediaAsset` do mesmo tenant com o mesmo `sha256` — aviso, não bloqueia o registro. */
  possivelDuplicata: MediaAsset | null;
}

/**
 * Registra os metadados técnicos de um binário já enviado — Fase 1 da
 * Fundação do Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5). O
 * upload físico em si (Vercel Blob) é responsabilidade da Central de
 * Publicação (fase futura); aqui só se recebe hash/mime/tamanho já
 * calculados e se cria o registro.
 *
 * Duplicidade por `sha256` dentro do tenant gera apenas aviso
 * (`possivelDuplicata`) — nunca bloqueia, pois o mesmo binário físico pode
 * legitimamente aparecer em mais de um Evento/Item do Acervo.
 */
export class RegisterMediaAssetUseCase {
  constructor(private readonly deps: RegisterMediaAssetDeps) {}

  async execute(
    ctx: AuthContext,
    input: RegisterMediaAssetFormValues,
  ): Promise<Result<RegisterMediaAssetOutput>> {
    requirePermission(ctx, 'mediaAsset:create');

    const possivelDuplicata = await this.deps.mediaAssetRepository.findBySha256(
      ctx.tenantId,
      input.sha256,
    );

    const now = this.deps.clock.now();
    const mediaAsset: MediaAsset = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      processingStatus: 'pendente',
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.mediaAssetRepository.create(mediaAsset);

    return ok({ mediaAsset, possivelDuplicata });
  }
}
