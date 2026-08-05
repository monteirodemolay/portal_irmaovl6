export const GALLERY_MEDIA_KINDS = ['foto', 'video'] as const;
export type GalleryMediaKind = (typeof GALLERY_MEDIA_KINDS)[number];

export const GALLERY_MEDIA_KIND_LABELS: Record<GalleryMediaKind, string> = {
  foto: 'Foto',
  video: 'Vídeo',
};
