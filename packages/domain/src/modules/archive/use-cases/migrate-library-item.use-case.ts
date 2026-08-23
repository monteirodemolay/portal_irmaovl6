import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IFileAssetRepository } from '../../document-management/repositories/file-asset.repository';
import type { ILibraryItemRepository } from '../../library/repositories/library-item.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';
import { MIGRATED_MEDIA_SHA256_PLACEHOLDER } from './migrate-gallery-album.use-case';
import {
  archiveItemTipoFromFileKind,
  archiveMediaTypeFromFileKind,
  EXTENSION_BY_FILE_KIND,
  MIME_TYPE_BY_FILE_KIND,
} from './migrate-file-asset.use-case';

export interface MigrateLibraryItemInput {
  libraryItemId: string;
  eventId: string;
}

export interface MigrateLibraryItemDeps {
  libraryItemRepository: ILibraryItemRepository;
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
 * Migração assistida, um item por vez, de um `LibraryItem` (Biblioteca
 * legada) para o modelo novo do Acervo VL6 (`ArchiveItem`/`ArchiveMedia`/
 * `MediaAsset`) — Fase C "Administração & métricas", espelhando
 * `MigrateGalleryAlbumUseCase` (Fase 5) e `MigrateFileAssetUseCase`.
 *
 * `LibraryItem` é só a camada de curadoria sobre um `FileAsset` (não é dono
 * de binário próprio — `LibraryItem.fileId`), então esta migração resolve o
 * `FileAsset` associado para os mesmos metadados técnicos que
 * `MigrateFileAssetUseCase` usa (tamanho real, mime/extensão por tipo,
 * `sha256` placeholder), mas marca a origem em
 * `ArchiveItem.origemLibraryItemId` (nunca `origemFileAssetId`) — migrar o
 * mesmo arquivo pela Biblioteca e pelos Arquivos não colide, são dois
 * `ArchiveItem`s distintos, cada um com seu próprio marcador de
 * idempotência.
 *
 * Regra de Preservação: NUNCA apaga, oculta ou altera o `LibraryItem`/
 * `FileAsset` de origem.
 *
 * Idempotência: usa `ArchiveItem.origemLibraryItemId` como marcador —
 * rejeita com `ConflictError` se já existir um `ArchiveItem` não excluído
 * do mesmo evento apontando para este item da Biblioteca.
 */
export class MigrateLibraryItemUseCase {
  constructor(private readonly deps: MigrateLibraryItemDeps) {}

  async execute(ctx: AuthContext, input: MigrateLibraryItemInput): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:create');

    const libraryItem = await this.deps.libraryItemRepository.findById(input.libraryItemId);
    if (!libraryItem || libraryItem.tenantId !== ctx.tenantId || libraryItem.deletedAt) {
      return err(new NotFoundError('LibraryItem', input.libraryItemId));
    }

    const file = await this.deps.fileAssetRepository.findById(libraryItem.fileId);
    if (!file || file.tenantId !== ctx.tenantId || file.deletedAt) {
      return err(new NotFoundError('FileAsset', libraryItem.fileId));
    }

    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', input.eventId));
    }

    const alreadyMigrated = (await this.deps.archiveItemRepository.findByEventId(event.id)).some(
      (item) => item.origemLibraryItemId === libraryItem.id,
    );
    if (alreadyMigrated) {
      return err(
        new ConflictError('Este item da Biblioteca já foi migrado para o Acervo neste evento.'),
      );
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
      origemLibraryItemId: libraryItem.id,
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
