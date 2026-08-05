import { del, head, put } from '@vercel/blob';
import type { UploadFileInput, UploadFileResult } from '../storage-types';

/**
 * Upload/leitura/remoção de binários no Vercel Blob — substitui o Firebase
 * Storage (docs/architecture, decisão pós-lançamento: Storage do Firebase
 * passou a exigir o plano Blaze mesmo para o bucket padrão, e o app já
 * roda na Vercel, então reaproveitar a mesma infraestrutura evita um
 * terceiro provedor). Mesma interface do `FirebaseStorageAdapter` — troca
 * transparente nos dois pontos de uso (`gallery-actions.ts`,
 * `document-management-actions.ts`).
 *
 * `path` funciona como identificador estável nos três métodos — o SDK do
 * Vercel Blob aceita tanto a URL completa quanto o pathname puro em
 * `del`/`head`, então não precisamos guardar a URL separadamente.
 */
export class VercelBlobStorageAdapter {
  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const blob = await put(input.path, input.buffer, {
      access: 'public',
      contentType: input.contentType,
      addRandomSuffix: false,
    });
    return { url: blob.url, sizeBytes: input.buffer.byteLength };
  }

  async getDownloadUrl(path: string): Promise<string> {
    const info = await head(path);
    return info.url;
  }

  async delete(path: string): Promise<void> {
    await del(path);
  }
}
