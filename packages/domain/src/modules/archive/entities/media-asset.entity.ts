import type { MediaAssetProcessingStatus, MediaAssetProvider } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Metadados técnicos de um binário já enviado ao Acervo — Fase 1 da
 * Fundação do Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5,
 * `mediaAssets`). O upload físico do arquivo fica fora de escopo desta
 * fase (Central de Publicação, fase futura); `RegisterMediaAssetUseCase`
 * só registra o resultado de um upload já realizado (hash, mime, tamanho,
 * `storageKey`).
 */
export interface MediaAsset extends BaseEntity {
  originalName: string;
  normalizedName: string;
  mimeType: string;
  extension: string;
  size: number;
  /** SHA-256 do binário — usado por `RegisterMediaAssetUseCase` para detectar duplicidade dentro do tenant (avisa, não bloqueia). */
  sha256: string;
  provider: MediaAssetProvider;
  storageKey: string;
  processingStatus: MediaAssetProcessingStatus;
  width: number | null;
  height: number | null;
  duration: number | null;
}
