import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

/**
 * Upload de foto de um `FamilyPerson` (familiar sem cadastro de `Member`) —
 * mesma validação/formato de `member-photo-upload.ts`, caminho de Blob
 * separado por não ser um Irmão cadastrado.
 */
export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export function validatePhotoFile(file: File): string | null {
  if (!(file.type in ALLOWED_PHOTO_TYPES)) {
    return 'Foto inválida: use JPG, PNG ou WEBP.';
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return 'Foto muito grande: o limite é 5 MB.';
  }
  return null;
}

export async function uploadFamilyPersonPhoto(
  file: File,
  tenantId: string,
  familyPersonId: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_PHOTO_TYPES[file.type] ?? 'jpg';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/family-persons/${familyPersonId}/foto-${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}
