import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

/**
 * Capa do Evento (vitrine "Eventos da Loja" do Início) — só raster, mesmo
 * conjunto da foto de perfil (`member-photo-upload.ts`): uma capa 1:1
 * estilo Instagram não precisa de SVG/GIF como a logomarca de negócio.
 */
export const ALLOWED_EVENT_COVER_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_EVENT_COVER_SIZE_BYTES = 5 * 1024 * 1024;

export function validateEventCoverFile(file: File): string | null {
  if (!(file.type in ALLOWED_EVENT_COVER_TYPES)) {
    return 'Imagem de capa inválida: use JPG, PNG ou WEBP.';
  }
  if (file.size > MAX_EVENT_COVER_SIZE_BYTES) {
    return 'Imagem de capa muito grande: o limite é 5 MB.';
  }
  return null;
}

export async function uploadEventCover(file: File, tenantId: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_EVENT_COVER_TYPES[file.type] ?? 'jpg';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/agenda/eventos/capa-${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}
