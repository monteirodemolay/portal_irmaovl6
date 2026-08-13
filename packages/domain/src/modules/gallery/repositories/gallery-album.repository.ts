import type { GalleryAlbum } from '../entities/gallery-album.entity';

export interface IGalleryAlbumRepository {
  findById(id: string): Promise<GalleryAlbum | null>;
  /** `categoria` filtra a busca por categoria — omitido lista todos os álbuns do tenant. */
  listByTenant(tenantId: string, categoria?: string): Promise<GalleryAlbum[]>;
  /** Total de álbuns (não excluídos) — usado pelo Painel administrativo. */
  countByTenant(tenantId: string): Promise<number>;
  create(album: GalleryAlbum): Promise<void>;
  update(album: GalleryAlbum): Promise<void>;
}
