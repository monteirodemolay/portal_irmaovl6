import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

/**
 * Foto de fundo do `PageHero` padronizado de uma página, enviada pelo
 * Administrador da Loja — mesma validação de `member-photo-upload.ts`
 * (só JPG/PNG/WEBP), limite maior (20 MB, como o protótipo já assumia)
 * porque é uma foto de ambiente/arquitetura, não um retrato.
 */
export const ALLOWED_HERO_PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_HERO_PHOTO_SIZE_BYTES = 20 * 1024 * 1024;

export function validateHeroPhotoFile(file: File): string | null {
  if (!(file.type in ALLOWED_HERO_PHOTO_TYPES)) {
    return 'Foto inválida: use JPG, PNG ou WEBP.';
  }
  if (file.size > MAX_HERO_PHOTO_SIZE_BYTES) {
    return 'Foto muito grande: o limite é 20 MB.';
  }
  return null;
}

export async function uploadHeroPhoto(file: File, tenantId: string, pageKey: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_HERO_PHOTO_TYPES[file.type] ?? 'jpg';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/hero/${pageKey}/hero-${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}
