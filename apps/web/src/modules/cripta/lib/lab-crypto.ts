/** Protótipo com dados fictícios. Não usar para guardar material pessoal. */
export interface LabCapsule {
  id: string;
  iv: string;
  ciphertext: string;
}
export interface LabBundle {
  format: 'vl6-cripta-lab';
  version: 1;
  items: LabCapsule[];
}

const associatedData = (id: string) => new TextEncoder().encode(`vl6-cripta-lab:v1:${id}`);
const bytesToBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
const base64ToBytes = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

export async function createLabKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportLabKey(key: CryptoKey): Promise<string> {
  return bytesToBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export async function importLabKey(value: string): Promise<CryptoKey> {
  const raw = base64ToBytes(value.trim());
  if (raw.length !== 32) throw new Error('A chave de teste deve ter 32 bytes.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}

export async function encryptLabCapsule(key: CryptoKey, title: string, letter: string): Promise<LabCapsule> {
  const id = crypto.randomUUID();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ title, letter }));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: associatedData(id) }, key, plaintext);
  return { id, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) };
}

export async function decryptLabCapsule(key: CryptoKey, item: LabCapsule): Promise<{ title: string; letter: string }> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(item.iv), additionalData: associatedData(item.id) },
    key,
    base64ToBytes(item.ciphertext),
  );
  const value: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (!value || typeof value !== 'object' || !('title' in value) || !('letter' in value) ||
      typeof value.title !== 'string' || typeof value.letter !== 'string') {
    throw new Error('Conteúdo inválido.');
  }
  return { title: value.title, letter: value.letter };
}

export function parseLabBundle(raw: string): LabBundle {
  if (raw.length > 65536) throw new Error('Pacote de teste excede 64 KB.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('format' in value) || value.format !== 'vl6-cripta-lab' ||
      !('version' in value) || value.version !== 1 || !('items' in value) || !Array.isArray(value.items) || value.items.length > 5 ||
      !value.items.every((item: unknown) => item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' &&
        'iv' in item && typeof item.iv === 'string' && 'ciphertext' in item && typeof item.ciphertext === 'string')) {
    throw new Error('Pacote de laboratório inválido.');
  }
  return value as LabBundle;
}
