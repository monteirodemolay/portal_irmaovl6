import type { GalleryMedia } from '../entities/gallery-media.entity';

export interface IGalleryMediaRepository {
  findById(id: string): Promise<GalleryMedia | null>;
  listByAlbum(albumId: string): Promise<GalleryMedia[]>;
  create(media: GalleryMedia): Promise<void>;
  update(media: GalleryMedia): Promise<void>;
}
