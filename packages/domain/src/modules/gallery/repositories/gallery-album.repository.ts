import type { GalleryAlbum } from '../entities/gallery-album.entity';

export interface IGalleryAlbumRepository {
  findById(id: string): Promise<GalleryAlbum | null>;
  /** `categoria` filtra a busca por categoria — omitido lista todos os álbuns do tenant. */
  listByTenant(tenantId: string, categoria?: string): Promise<GalleryAlbum[]>;
  create(album: GalleryAlbum): Promise<void>;
  update(album: GalleryAlbum): Promise<void>;
}
