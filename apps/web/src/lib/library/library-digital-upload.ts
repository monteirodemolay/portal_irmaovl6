import { randomUUID } from 'node:crypto';
import type { FileKind } from '@vl6/shared';
import { VercelBlobStorageAdapter } from '@vl6/infra';

const MAX_DIGITAL_FILE_SIZE = 12 * 1024 * 1024;
const SUPPORTED_TYPES: Record<string, { extension: string; kind: FileKind }> = {
  'application/pdf': { extension: 'pdf', kind: 'pdf' },
  'application/msword': { extension: 'doc', kind: 'word' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extension: 'docx',
    kind: 'word',
  },
};

export function validateLibraryDigitalFile(file: File): string | null {
  if (!SUPPORTED_TYPES[file.type]) return 'Envie um arquivo PDF, DOC ou DOCX.';
  if (file.size > MAX_DIGITAL_FILE_SIZE) return 'O arquivo digital deve ter no máximo 12 MB.';
  return null;
}

export async function uploadLibraryDigitalFile(file: File, tenantId: string) {
  const descriptor = SUPPORTED_TYPES[file.type];
  if (!descriptor) throw new Error('unsupported_file_type');

  const path = `tenants/${tenantId}/biblioteca/arquivos/${randomUUID()}.${descriptor.extension}`;
  const storage = new VercelBlobStorageAdapter();
  const result = await storage.upload({
    path,
    buffer: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  return { ...result, path, kind: descriptor.kind };
}

export async function deleteLibraryDigitalFile(path: string): Promise<void> {
  await new VercelBlobStorageAdapter().delete(path);
}
