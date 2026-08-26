import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

/**
 * Logo do negócio (Comunidade VL6 § Negócios & Serviços) — ao contrário da
 * foto de perfil (`member-photo-upload.ts`, só JPG/PNG/WEBP), aceita também
 * SVG e GIF: uma logomarca legitimamente vem em mais formatos que uma foto
 * de rosto, e recusar o arquivo que o Irmão já tem à mão é o tipo de atrito
 * que esvazia o cadastro.
 */
export const ALLOWED_LOGO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
};
export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

export function validateLogoFile(file: File): string | null {
  if (!(file.type in ALLOWED_LOGO_TYPES)) {
    return 'Logo inválida: use JPG, PNG, WEBP, SVG ou GIF.';
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return 'Logo muito grande: o limite é 5 MB.';
  }
  return null;
}

export async function uploadBusinessLogo(
  file: File,
  tenantId: string,
  memberId: string,
  businessId: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_LOGO_TYPES[file.type] ?? 'jpg';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/members/${memberId}/negocios/${businessId}/logo-${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}
