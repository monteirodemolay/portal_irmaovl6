import type { BaseEntity } from '../../../shared/base-entity';

export interface GalleryAlbum extends BaseEntity {
  titulo: string;
  categoria: string;
  capaUrl: string | null;
  dataEvento: Date;
}
