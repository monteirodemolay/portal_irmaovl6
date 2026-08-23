import type { ArchiveItemTypeKey, ArchiveMediaTypeKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IFileAssetRepository } from '../../document-management/repositories/file-asset.repository';
import type { FileAsset } from '../../document-management/entities/file-asset.entity';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';
import { MIGRATED_MEDIA_SHA256_PLACEHOLDER } from './migrate-gallery-album.use-case';

export interface MigrateFileAssetInput {
  fileId: string;
  eventId: string;
}

export interface MigrateFileAssetDeps {
  fileAssetRepository: IFileAssetRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  mediaAssetRepository: IMediaAssetRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * `FileAsset.tipo` → classificação editorial do `ArchiveItem` resultante.
 * Vídeo vira audiovisual, imagem vira fotografia; os demais formatos de
 * documento (pdf/word/excel/powerpoint) viram `documento`.
 */
export function archiveItemTipoFromFileKind(tipo: FileAsset['tipo']): ArchiveItemTypeKey {
  if (tipo === 'video') return 'audiovisual';
  if (tipo === 'imagem') return 'fotografia';
  return 'documento';
}

/** `FileAsset.tipo` → tipo técnico da `ArchiveMedia` (`ARCHIVE_MEDIA_TYPE_KEYS`). */
export function archiveMediaTypeFromFileKind(tipo: FileAsset['tipo']): ArchiveMediaTypeKey {
  if (tipo === 'video') return 'video';
  if (tipo === 'imagem') return 'foto';
  return 'documento';
}

export const MIME_TYPE_BY_FILE_KIND: Record<FileAsset['tipo'], string> = {
  pdf: 'application/pdf',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  powerpoint: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  imagem: 'image/jpeg',
  video: 'video/mp4',
};

export const EXTENSION_BY_FILE_KIND: Record<FileAsset['tipo'], string> = {
  pdf: 'pdf',
  word: 'docx',
  excel: 'xlsx',
  powerpoint: 'pptx',
  imagem: 'jpg',
  video: 'mp4',
};

/**
 * Migração assistida, um arquivo por vez, de um `FileAsset` (Arquivos
 * legado) para o modelo novo do Acervo VL6 (`ArchiveItem`/`ArchiveMedia`/
 * `MediaAsset`) — Fase C "Administração & métricas", espelhando
 * `MigrateGalleryAlbumUseCase` (Fase 5).
 *
 * Regra de Preservação: NUNCA apaga, oculta ou altera o `FileAsset` de
 * origem — ele continua existindo e visível normalmente em `/arquivos` e
 * `/admin/acervo/arquivos`. O `MediaAsset` criado aqui referencia o MESMO
 * `urlArquivo` do binário legado — sem re-upload. Diferente da migração da
 * Galeria (que nunca guardou tamanho), `FileAsset.tamanhoBytes` já é real e
 * é reaproveitado como `MediaAsset.size` — só o `sha256` usa o placeholder
 * (`MIGRATED_MEDIA_SHA256_PLACEHOLDER`), porque calcular o hash real
 * exigiria baixar o binário do Vercel Blob durante a migração.
 *
 * O `ArchiveItem` resultante nasce sempre `publicacaoStatus: 'rascunho'` —
 * revisão e publicação continuam manuais pela Central de Publicação.
 *
 * Idempotência: usa `ArchiveItem.origemFileAssetId` como marcador — rejeita
 * com `ConflictError` se já existir um `ArchiveItem` não excluído do mesmo
 * evento apontando para este arquivo.
 */
export class MigrateFileAssetUseCase {
  constructor(private readonly deps: MigrateFileAssetDeps) {}

  async execute(ctx: AuthContext, input: MigrateFileAssetInput): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:create');

    const file = await this.deps.fileAssetRepository.findById(input.fileId);
    if (!file || file.tenantId !== ctx.tenantId || file.deletedAt) {
      return err(new NotFoundError('FileAsset', input.fileId));
    }

    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', input.eventId));
    }

    const alreadyMigrated = (await this.deps.archiveItemRepository.findByEventId(event.id)).some(
      (item) => item.origemFileAssetId === file.id,
    );
    if (alreadyMigrated) {
      return err(new ConflictError('Este arquivo já foi migrado para o Acervo neste evento.'));
    }

    const boardTermId =
      (await this.deps.boardTermRepository.findByDate(ctx.tenantId, event.dataInicio))?.id ?? null;

    const now = this.deps.clock.now();

    const archiveItem: ArchiveItem = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId: event.id,
      boardTermId,
      titulo: file.titulo,
      tipo: archiveItemTipoFromFileKind(file.tipo),
      descricao: file.descricao,
      nivelAcesso: event.nivelAcesso,
      publicacaoStatus: 'rascunho',
      capaMediaId: null,
      origemFileAssetId: file.id,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveItemRepository.create(archiveItem);

    const mediaAsset: MediaAsset = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      originalName: file.titulo,
      normalizedName: file.titulo,
      mimeType: MIME_TYPE_BY_FILE_KIND[file.tipo],
      extension: EXTENSION_BY_FILE_KIND[file.tipo],
      size: file.tamanhoBytes,
      sha256: MIGRATED_MEDIA_SHA256_PLACEHOLDER,
      provider: 'vercel_blob',
      storageKey: file.urlArquivo,
      processingStatus: 'concluido',
      width: null,
      height: null,
      duration: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.mediaAssetRepository.create(mediaAsset);

    const archiveMedia: ArchiveMedia = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId: archiveItem.eventId,
      boardTermId: archiveItem.boardTermId,
      archiveItemId: archiveItem.id,
      mediaAssetId: mediaAsset.id,
      mediaType: archiveMediaTypeFromFileKind(file.tipo),
      documentType: file.tipo,
      role: null,
      order: 0,
      caption: null,
      altText: null,
      isCover: false,
      isFeatured: false,
      accessLevel: event.nivelAcesso,
      allowDownload: file.permitirDownload,
      publicacaoStatus: 'rascunho',
      autor: file.autor,
      tags: [],
      pessoasIdentificadas: [],
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveMediaRepository.create(archiveMedia);

    return ok(archiveItem);
  }
}
