import 'server-only';
import type { ServerContainer } from '@vl6/infra';
import { VercelBlobStorageAdapter } from '@vl6/infra';

export interface ArchiveMediaBinaryOk {
  ok: true;
  /** Corpo bruto do binário — nunca a URL do Vercel Blob, sempre o `body` já obtido do upstream. */
  webStream: ReadableStream<Uint8Array>;
  mimeType: string;
  originalName: string;
}

export interface ArchiveMediaBinaryError {
  ok: false;
  status: 404 | 502;
}

export type ArchiveMediaBinaryResult = ArchiveMediaBinaryOk | ArchiveMediaBinaryError;

/**
 * Resolve o binário de uma `ArchiveMedia` (ou de sua miniatura de vídeo,
 * `variant: 'poster'`) contra o storage — mesma resolução usada pelo proxy
 * autenticado `/api/archive-media/[archiveMediaId]` (Fase 3), extraída aqui
 * (Fase D) para ser reaproveitada também pela exportação em ZIP/PDF do
 * álbum de evento, sem duplicar a lógica de `getDownloadUrl`/`fetch`. Nunca
 * retorna nem expõe a URL do Vercel Blob — só o stream do binário já obtido
 * no servidor.
 */
export async function fetchArchiveMediaBinary(
  container: ServerContainer,
  tenantId: string,
  archiveMediaId: string,
  variant: 'original' | 'poster' = 'original',
): Promise<ArchiveMediaBinaryResult> {
  const media = await container.repositories.archiveMedia.findById(archiveMediaId);
  if (!media || media.tenantId !== tenantId || media.deletedAt) {
    return { ok: false, status: 404 };
  }

  const mediaAssetId =
    variant === 'poster' ? (media.posterMediaAssetId ?? null) : media.mediaAssetId;
  if (!mediaAssetId) return { ok: false, status: 404 };

  const asset = await container.repositories.mediaAsset.findById(mediaAssetId);
  if (!asset || asset.tenantId !== tenantId || asset.deletedAt) {
    return { ok: false, status: 404 };
  }

  const storage = new VercelBlobStorageAdapter();
  let downloadUrl: string;
  try {
    downloadUrl = await storage.getDownloadUrl(asset.storageKey);
  } catch {
    return { ok: false, status: 502 };
  }

  const upstream = await fetch(downloadUrl);
  if (!upstream.ok || !upstream.body) {
    return { ok: false, status: 502 };
  }

  return {
    ok: true,
    webStream: upstream.body,
    mimeType: asset.mimeType || 'application/octet-stream',
    originalName: asset.originalName,
  };
}
