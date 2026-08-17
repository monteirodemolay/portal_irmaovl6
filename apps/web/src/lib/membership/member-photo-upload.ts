import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

/**
 * Compartilhado entre o cadastro administrativo (`member-actions.ts`) e o
 * autoatendimento (`self-profile-actions.ts`) — mesma validação e mesmo
 * caminho de upload para a foto do Irmão, qualquer que seja quem a envia.
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

export async function uploadMemberPhoto(
  file: File,
  tenantId: string,
  memberId: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_PHOTO_TYPES[file.type] ?? 'jpg';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/members/${memberId}/foto-${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}
