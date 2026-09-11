import type { AttachMediaToArchiveItemFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';

export interface AttachMediaToArchiveItemDeps {
  archiveMediaRepository: IArchiveMediaRepository;
  archiveItemRepository: IArchiveItemRepository;
  mediaAssetRepository: IMediaAssetRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Liga um `MediaAsset` a um `ArchiveItem` — Fase 1 da Fundação do Acervo
 * VL6 (docs/architecture/11-acervo-vl6.md §11.5).
 *
 * `eventId`/`boardTermId` NUNCA vêm do input: são sempre herdados do
 * `ArchiveItem` pai, para impedir mídia "solta" sem o mesmo vínculo de
 * proveniência do item — mesmo espírito da regra central de
 * `CreateArchiveItemUseCase`.
 */
export class AttachMediaToArchiveItemUseCase {
  constructor(private readonly deps: AttachMediaToArchiveItemDeps) {}

  async execute(
    ctx: AuthContext,
    input: AttachMediaToArchiveItemFormValues,
  ): Promise<Result<ArchiveMedia>> {
    requirePermission(ctx, 'archiveMedia:create');

    const item = await this.deps.archiveItemRepository.findById(input.archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', input.archiveItemId));
    }

    const mediaAsset = await this.deps.mediaAssetRepository.findById(input.mediaAssetId);
    if (!mediaAsset || mediaAsset.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('MediaAsset', input.mediaAssetId));
    }

    // Pré-marca como pessoas identificadas todo Irmão de origem do item
    // (iniciação/elevação/exaltação) — pedido explícito: numa sessão com
    // vários iniciados juntos, o Admin não deveria precisar marcar de novo,
    // uma a uma, gente que o próprio Acervo já sabia estar naquela sessão.
    // Continua editável: é só um ponto de partida, não uma trava.
    const pessoasDeOrigem = [
      ...(item.origemIniciacaoMemberIds ?? []),
      ...(item.origemElevacaoMemberIds ?? []),
      ...(item.origemExaltacaoMemberIds ?? []),
    ];

    const now = this.deps.clock.now();
    const archiveMedia: ArchiveMedia = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId: item.eventId,
      boardTermId: item.boardTermId,
      archiveItemId: item.id,
      mediaAssetId: mediaAsset.id,
      mediaType: input.mediaType,
      documentType: input.documentType,
      role: input.role,
      order: input.order,
      caption: input.caption,
      altText: input.altText,
      isCover: false,
      isFeatured: false,
      accessLevel: input.accessLevel,
      allowDownload: input.allowDownload,
      publicacaoStatus: 'rascunho',
      autor: null,
      tags: [],
      pessoasIdentificadas: pessoasDeOrigem,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveMediaRepository.create(archiveMedia);

    return ok(archiveMedia);
  }
}
