import type { ArchiveItemTypeKey, ArchiveMediaTypeKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IGalleryAlbumRepository } from '../../gallery/repositories/gallery-album.repository';
import type { IGalleryMediaRepository } from '../../gallery/repositories/gallery-media.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';

export interface MigrateGalleryAlbumInput {
  albumId: string;
  eventId: string;
}

export interface MigrateGalleryAlbumDeps {
  galleryAlbumRepository: IGalleryAlbumRepository;
  galleryMediaRepository: IGalleryMediaRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  mediaAssetRepository: IMediaAssetRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Placeholder de `MediaAsset.sha256` para binários migrados da Galeria
 * legada. `GalleryMedia` nunca guardou hash do binário (só `url`), e o
 * cálculo real exigiria baixar cada arquivo do Vercel Blob durante a
 * migração — fora do escopo desta ação manual, um álbum por vez. Como
 * `RegisterMediaAssetUseCase` exige um `sha256` de 64 caracteres
 * hexadecimais só na validação de formulário (`registerMediaAssetSchema`),
 * não na entidade em si, este caso de uso monta o `MediaAsset` diretamente
 * (sem passar pelo schema) e usa este sentinel — nunca colide com um hash
 * real (que sempre tem pelo menos um dígito diferente de zero) e nunca
 * aciona falsamente o aviso de duplicidade de `RegisterMediaAssetUseCase`.
 */
export const MIGRATED_MEDIA_SHA256_PLACEHOLDER = '0'.repeat(64);

/**
 * Migração assistida, um álbum por vez, de um `GalleryAlbum` (Galeria
 * legada) para o modelo novo do Acervo VL6 (`ArchiveItem`/`ArchiveMedia`/
 * `MediaAsset`) — Fase 5 (docs/architecture/11-acervo-vl6.md §11.6e).
 *
 * Regra de Preservação: NUNCA apaga, oculta ou altera o `GalleryAlbum`/
 * `GalleryMedia` de origem — eles continuam existindo e visíveis
 * normalmente em `/galeria`. Os `MediaAsset`s criados aqui referenciam o
 * MESMO `storageKey` (a URL do Vercel Blob já existente) do binário
 * legado — sem re-upload, é só um novo registro de metadados.
 *
 * O `ArchiveItem` resultante nasce sempre `publicacaoStatus: 'rascunho'`
 * — esta ação nunca publica sozinha, o Administrador revisa e publica
 * depois pela Central de Publicação (`/admin/acervo/publicar`), mesmo
 * espírito de `CreateArchiveItemUseCase`.
 *
 * Idempotência: usa `ArchiveItem.origemGalleryAlbumId` como marcador —
 * rejeita com `ConflictError` se já existir um `ArchiveItem` não
 * excluído do mesmo evento apontando para este álbum, para não duplicar
 * a migração do mesmo álbum.
 */
export class MigrateGalleryAlbumUseCase {
  constructor(private readonly deps: MigrateGalleryAlbumDeps) {}

  async execute(ctx: AuthContext, input: MigrateGalleryAlbumInput): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:create');

    const album = await this.deps.galleryAlbumRepository.findById(input.albumId);
    if (!album || album.tenantId !== ctx.tenantId || album.deletedAt) {
      return err(new NotFoundError('GalleryAlbum', input.albumId));
    }

    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', input.eventId));
    }

    const alreadyMigrated = (await this.deps.archiveItemRepository.findByEventId(event.id)).some(
      (item) => item.origemGalleryAlbumId === album.id,
    );
    if (alreadyMigrated) {
      return err(new ConflictError('Este álbum já foi migrado para o Acervo neste evento.'));
    }

    const boardTermId =
      (await this.deps.boardTermRepository.findByDate(ctx.tenantId, event.dataInicio))?.id ?? null;

    const galleryMedias = (await this.deps.galleryMediaRepository.listByAlbum(album.id))
      .filter((media) => !media.deletedAt)
      .sort((a, b) => a.ordem - b.ordem);

    const now = this.deps.clock.now();
    const itemTipo: ArchiveItemTypeKey = galleryMedias.some((media) => media.tipo === 'video')
      ? 'audiovisual'
      : 'fotografia';

    const archiveItem: ArchiveItem = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId: event.id,
      boardTermId,
      titulo: album.titulo,
      tipo: itemTipo,
      descricao: null,
      nivelAcesso: event.nivelAcesso,
      publicacaoStatus: 'rascunho',
      capaMediaId: null,
      origemGalleryAlbumId: album.id,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveItemRepository.create(archiveItem);

    for (const [index, galleryMedia] of galleryMedias.entries()) {
      const mediaType: ArchiveMediaTypeKey = galleryMedia.tipo === 'video' ? 'video' : 'foto';

      const mediaAsset: MediaAsset = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        originalName: album.titulo,
        normalizedName: album.titulo,
        mimeType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        extension: mediaType === 'video' ? 'mp4' : 'jpg',
        size: 0,
        sha256: MIGRATED_MEDIA_SHA256_PLACEHOLDER,
        provider: 'vercel_blob',
        // Mesma URL do binário já enviado — sem re-upload. O adaptador do
        // Vercel Blob aceita tanto o pathname quanto a URL completa como
        // `storageKey` (ver `VercelBlobStorageAdapter`).
        storageKey: galleryMedia.url,
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
        mediaType,
        documentType: null,
        role: null,
        order: index,
        caption: null,
        altText: null,
        isCover: false,
        isFeatured: false,
        accessLevel: event.nivelAcesso,
        allowDownload: false,
        publicacaoStatus: 'rascunho',
        autor: null,
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
    }

    return ok(archiveItem);
  }
}
