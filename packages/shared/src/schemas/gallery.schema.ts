import { z } from 'zod';
import { GALLERY_MEDIA_KINDS } from '../enums/gallery';

export const galleryAlbumSchema = z.object({
  titulo: z.string().min(1).max(200),
  categoria: z.string().min(1).max(100),
  capaUrl: z.string().url().nullable(),
  dataEvento: z.coerce.date(),
});
export type GalleryAlbumFormValues = z.infer<typeof galleryAlbumSchema>;

export const galleryMediaSchema = z.object({
  albumId: z.string().min(1),
  tipo: z.enum(GALLERY_MEDIA_KINDS),
  url: z.string().url(),
  urlMiniatura: z.string().url().nullable(),
  ordem: z.coerce.number().int().min(0),
});
export type GalleryMediaFormValues = z.infer<typeof galleryMediaSchema>;
