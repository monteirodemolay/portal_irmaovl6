import { randomUUID } from 'node:crypto';
import { VercelBlobStorageAdapter } from '@vl6/infra';

/**
 * Anexos da Situação Maçônica (prancha, ofício, digitalização de
 * documento) — aceita bem mais formatos que a foto de perfil
 * (`member-photo-upload.ts`), já que aqui o mais comum é PDF, não imagem.
 */
export const ALLOWED_SITUATION_ATTACHMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_SITUATION_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export function validateSituationAttachmentFile(file: File): string | null {
  if (!(file.type in ALLOWED_SITUATION_ATTACHMENT_TYPES)) {
    return `Anexo "${file.name}" inválido: use PDF, JPG, PNG ou WEBP.`;
  }
  if (file.size > MAX_SITUATION_ATTACHMENT_SIZE_BYTES) {
    return `Anexo "${file.name}" muito grande: o limite é 10 MB.`;
  }
  return null;
}

export async function uploadMemberSituationAttachment(
  file: File,
  tenantId: string,
  memberId: string,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_SITUATION_ATTACHMENT_TYPES[file.type] ?? 'pdf';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/members/${memberId}/situacao/${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}
