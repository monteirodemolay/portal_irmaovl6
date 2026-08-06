import { put } from '@vercel/blob';

/**
 * Upload de um arquivo de backup pro Vercel Blob. Deliberadamente
 * diferente de `VercelBlobStorageAdapter.upload` (que usa
 * `addRandomSuffix: false` para paths estáveis de arquivos públicos, ex.:
 * galeria): backups têm dados sensíveis (e-mail, PII de Irmãos) e o Vercel
 * Blob só tem acesso "public" — o sufixo aleatório (padrão, não
 * sobrescrito aqui) é a única proteção contra descoberta da URL por
 * quem já conhece o hostname do store (exposto pelos uploads públicos).
 */
export async function putBackupBlob(path: string, content: string): Promise<void> {
  await put(path, content, { access: 'public', contentType: 'application/json' });
}
