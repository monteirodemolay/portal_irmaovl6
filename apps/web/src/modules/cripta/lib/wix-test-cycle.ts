import 'server-only';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';

const API = 'https://www.wixapis.com';
// Identificador do projeto Wix observado no editor da VL6. Nunca é uma credencial.
const VL6_WIX_PROJECT_ID = '5ffa01ac-42b4-48e6-aacc-31adb6fe3dac';

async function wix<T>(path: string, body: object): Promise<T> {
  const key = process.env.WIX_CRIPTA_API_KEY;
  if (!key) throw new Error('Chave Wix ausente neste deployment.');
  if (/^(sk_live_|sk_test_|pk_live_|pk_test_)/.test(key) || key.includes('...')) {
    throw new Error('Credencial configurada não parece uma chave Wix.');
  }
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: key, 'wix-site-id': VL6_WIX_PROJECT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  // Nunca registre corpo ou cabeçalhos: podem conter URLs assinadas e credenciais.
  if (!response.ok) throw new Error(`Wix Media: HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

export type WixTestResult = {
  encrypted: boolean;
  privateFile: boolean;
  integrity: boolean;
  deleted: boolean;
  fileId?: string;
};

/** Only an artificial 1 KiB sample is accepted; no user file enters this workflow. */
export async function runWixTestCycle(): Promise<WixTestResult> {
  const plaintext = randomBytes(1024);
  const key = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([nonce, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  key.fill(0);
  plaintext.fill(0);
  const digest = createHash('sha256').update(ciphertext).digest('hex');
  const filename = `cripta-teste-${randomBytes(8).toString('hex')}.bin`;
  const upload = await wix<{ uploadUrl: string }>('/site-media/v1/files/generate-upload-url', {
    mimeType: 'application/octet-stream', fileName: filename, filePath: '/cripta-ensaio', private: true,
  });
  if (!upload.uploadUrl || new URL(upload.uploadUrl).protocol !== 'https:') throw new Error('URL de upload inválida.');
  const response = await fetch(upload.uploadUrl, {
    method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' },
    body: ciphertext, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Upload Wix: HTTP ${response.status}.`);
  const result = await response.json() as { file?: { id?: string; private?: boolean } };
  const fileId = result.file?.id;
  if (!fileId) throw new Error('Wix não retornou ID do pacote de teste.');
  let integrity = false;
  let deleted = false;
  let privateFile = false;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const descriptor = await wix<{ files?: Array<{ private?: boolean }> }>(
        '/site-media/v1/files/get-files', { fileIds: [fileId] },
      );
      if (descriptor.files?.[0]) {
        privateFile = descriptor.files[0].private === true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (!privateFile) throw new Error('Não foi possível confirmar que o arquivo está privado.');
    // Wix may take time to process an uploaded file before it is downloadable.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const urlResult = await wix<{ downloadUrl: string }>(
          '/site-media/v1/files/generate-file-download-url', { fileId },
        );
        if (!urlResult.downloadUrl || new URL(urlResult.downloadUrl).protocol !== 'https:') throw new Error('Download inválido.');
        const download = await fetch(urlResult.downloadUrl, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
        if (!download.ok) throw new Error('Arquivo ainda indisponível.');
        const downloaded = Buffer.from(await download.arrayBuffer());
        integrity = createHash('sha256').update(downloaded).digest('hex') === digest;
        break;
      } catch {
        if (attempt === 3) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  } finally {
    await wix('/site-media/v1/bulk/files/delete', { fileIds: [fileId], permanent: true });
    deleted = true;
  }
  return { encrypted: true, privateFile, integrity, deleted, fileId };
}
