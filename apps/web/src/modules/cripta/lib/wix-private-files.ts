import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { wixError } from './wix-error';

const API = 'https://www.wixapis.com';
const SITE_ID = '5ffa01ac-42b4-48e6-aacc-31adb6fe3dac';
const FOLDER_NAME = 'Cripta — Temporário';

async function wix<T>(path: string, body: object): Promise<T> {
  const key = process.env.WIX_CRIPTA_API_KEY;
  if (!key) throw new Error('Integração Wix não configurada.');
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: key, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw await wixError(response, path.split('/').pop() ?? 'api');
  return response.json() as Promise<T>;
}

function signedUrl(value: string | undefined): string {
  if (!value) throw new Error('URL Wix ausente.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('URL Wix inválida.');
  return url.toString();
}

async function ensureTemporaryFolder(): Promise<string> {
  const key = process.env.WIX_CRIPTA_API_KEY;
  if (!key) throw new Error('Integração Wix não configurada.');
  const response = await fetch(`${API}/site-media/v1/folders`, {
    headers: { Authorization: key, 'wix-site-id': SITE_ID },
    cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw await wixError(response, 'listar-pastas');
  const listing = await response.json() as { folders?: Array<{ id?: string; displayName?: string }> };
  const existing = listing.folders?.find((folder) => folder.displayName === FOLDER_NAME && folder.id);
  if (existing?.id) return existing.id;
  const created = await wix<{ folder?: { id?: string } }>('/site-media/v1/folders', {
    displayName: FOLDER_NAME, parentFolderId: 'media-root',
  });
  if (!created.folder?.id) throw new Error('Wix não confirmou a pasta temporária.');
  return created.folder.id;
}

export async function uploadPrivateCiphertext(ciphertext: Buffer): Promise<{ fileId: string; sha256: string }> {
  if (ciphertext.length < 30 || ciphertext.length > 1_500_000) throw new Error('Pacote acima do limite da carta.');
  const sha256 = createHash('sha256').update(ciphertext).digest('hex');
  const parentFolderId = await ensureTemporaryFolder();
  const ticket = await wix<{ uploadUrl: string }>('/site-media/v1/files/generate-upload-url', {
    mimeType: 'application/octet-stream', fileName: `${randomUUID()}.bin`, parentFolderId, private: true,
  });
  const response = await fetch(signedUrl(ticket.uploadUrl), {
    method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(ciphertext), signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Upload Wix: HTTP ${response.status}.`);
  const uploaded = await response.json() as { file?: { id?: string; parentFolderId?: string } };
  const fileId = uploaded.file?.id;
  if (!fileId) throw new Error('Wix não identificou o arquivo enviado.');
  try {
    if (uploaded.file?.parentFolderId !== parentFolderId) throw new Error('Arquivo fora da pasta temporária.');
    let privateFile = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const descriptor = await wix<{ files?: Array<{ id?: string; private?: boolean }> }>(
        '/site-media/v1/files/get-files', { fileIds: [fileId] },
      );
      if (descriptor.files?.[0]) {
        privateFile = descriptor.files[0].id === fileId && descriptor.files[0].private === true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (!privateFile) throw new Error('Privacidade do arquivo Wix não confirmada.');
    return { fileId, sha256 };
  } catch (error) {
    try { await deletePrivateCiphertext(fileId); } catch { /* orphan requires reconciliation */ }
    throw error;
  }
}

export async function downloadPrivateCiphertext(fileId: string, sha256: string): Promise<Buffer> {
  if (!fileId || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Referência inválida.');
  const ticket = await wix<{ downloadUrl: string }>(
    '/site-media/v1/files/generate-file-download-url', { fileId },
  );
  const response = await fetch(signedUrl(ticket.downloadUrl), { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (!response.ok || declaredSize > 1_500_000) throw new Error('Arquivo Wix indisponível ou acima do limite.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 1_500_000 || createHash('sha256').update(bytes).digest('hex') !== sha256) {
    throw new Error('Falha de integridade do pacote cifrado.');
  }
  return bytes;
}

export async function deletePrivateCiphertext(fileId: string): Promise<void> {
  await wix('/site-media/v1/bulk/files/delete', { fileIds: [fileId], permanent: true });
}
