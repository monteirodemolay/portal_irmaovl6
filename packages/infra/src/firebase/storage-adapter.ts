import { randomUUID } from 'node:crypto';
import { getAdminStorage } from './admin-app';

export interface UploadFileInput {
  path: string;
  buffer: Buffer;
  contentType: string;
}

export interface UploadFileResult {
  url: string;
  sizeBytes: number;
}

/**
 * Upload/leitura/remoção de binários no Firebase Storage — usado apenas
 * pela camada de apresentação (Server Actions); o domínio nunca importa
 * isto diretamente, recebendo somente a URL já resolvida via
 * `CreateFileAssetUseCase`/`UpdateFileAssetUseCase` (docs/architecture/06
 * §6.3, decisão de manter Clean Architecture mesmo para upload binário).
 *
 * Gera um `firebaseStorageDownloadTokens` no mesmo formato usado pelo SDK
 * client-side, produzindo uma URL estável e não expirável — compatível com
 * `FileAsset.urlArquivo` sendo persistido como texto simples, sem precisar
 * gerar signed URLs sob demanda a cada leitura.
 */
export class FirebaseStorageAdapter {
  private readonly bucket = getAdminStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);

  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const token = randomUUID();
    const file = this.bucket.file(input.path);
    await file.save(input.buffer, {
      contentType: input.contentType,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    return { url: this.buildDownloadUrl(input.path, token), sizeBytes: input.buffer.byteLength };
  }

  async getDownloadUrl(path: string): Promise<string> {
    const [metadata] = await this.bucket.file(path).getMetadata();
    const token = (metadata.metadata?.firebaseStorageDownloadTokens as string | undefined)?.split(
      ',',
    )[0];
    if (!token) {
      throw new Error(`Arquivo ${path} não possui download token.`);
    }
    return this.buildDownloadUrl(path, token);
  }

  async delete(path: string): Promise<void> {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }

  private buildDownloadUrl(path: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  }
}
