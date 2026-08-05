import type { GalleryMediaKind } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface GalleryMedia extends BaseEntity {
  albumId: string;
  tipo: GalleryMediaKind;
  url: string;
  urlMiniatura: string | null;
  ordem: number;
}
