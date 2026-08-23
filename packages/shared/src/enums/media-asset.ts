/**
 * `MediaAsset` e `ArchiveMedia` — Fase 1 da Fundação do Acervo VL6 (ver
 * docs/architecture/11-acervo-vl6.md §11.5). O upload físico do binário
 * fica fora de escopo desta fase (Central de Publicação, fase futura):
 * `RegisterMediaAssetUseCase` só registra metadados técnicos já calculados
 * de um upload já realizado.
 */
export const MEDIA_ASSET_PROCESSING_STATUS_KEYS = [
  'pendente',
  'processando',
  'concluido',
  'erro',
] as const;
export type MediaAssetProcessingStatus = (typeof MEDIA_ASSET_PROCESSING_STATUS_KEYS)[number];

export const MEDIA_ASSET_PROCESSING_STATUS_LABELS: Record<MediaAssetProcessingStatus, string> = {
  pendente: 'Pendente',
  processando: 'Processando',
  concluido: 'Concluído',
  erro: 'Erro',
};

/** Provedor de armazenamento do binário — hoje só Vercel Blob (`packages/infra/src/vercel`). */
export const MEDIA_ASSET_PROVIDER_KEYS = ['vercel_blob'] as const;
export type MediaAssetProvider = (typeof MEDIA_ASSET_PROVIDER_KEYS)[number];

export const MEDIA_ASSET_PROVIDER_LABELS: Record<MediaAssetProvider, string> = {
  vercel_blob: 'Vercel Blob',
};

/** Tipo técnico da mídia anexada a um `ArchiveItem` (distinto de `ArchiveItemTypeKey`, a classificação editorial do item). */
export const ARCHIVE_MEDIA_TYPE_KEYS = ['foto', 'video', 'audio', 'documento'] as const;
export type ArchiveMediaTypeKey = (typeof ARCHIVE_MEDIA_TYPE_KEYS)[number];

export const ARCHIVE_MEDIA_TYPE_LABELS: Record<ArchiveMediaTypeKey, string> = {
  foto: 'Foto',
  video: 'Vídeo',
  audio: 'Áudio',
  documento: 'Documento',
};

/** Ciclo de vida editorial de uma mídia — distinto de `status`/`ativo` herdados de `BaseEntity` (soft delete). */
export const ARCHIVE_MEDIA_STATUS_KEYS = ['rascunho', 'publicado', 'oculto', 'arquivado'] as const;
export type ArchiveMediaStatus = (typeof ARCHIVE_MEDIA_STATUS_KEYS)[number];

export const ARCHIVE_MEDIA_STATUS_LABELS: Record<ArchiveMediaStatus, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  oculto: 'Oculto',
  arquivado: 'Arquivado',
};
