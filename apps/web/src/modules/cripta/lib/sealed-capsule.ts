/** Portable v1 encrypted envelope. Only call in a trusted browser context. */
export type SealedCapsule = {
  format: 'vl6-capsule-v1';
  kdf: 'PBKDF2-SHA256';
  iterations: 600_000;
  cipher: 'AES-256-GCM';
  salt: string;
  nonce: string;
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function fromBase64(value: string, maxBytes: number): Uint8Array {
  if (value.length > Math.ceil(maxBytes / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Pacote cifrado inválido.');
  }
  const binary = atob(value);
  if (binary.length > maxBytes) throw new Error('Pacote acima do limite.');
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (passphrase.length < 16) throw new Error('Use uma frase secreta de pelo menos 16 caracteres.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 600_000 },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function sealCapsule(cleartext: Uint8Array, passphrase: string): Promise<SealedCapsule> {
  if (cleartext.byteLength > 1024 * 1024) throw new Error('Esta versão aceita somente uma carta de até 1 MB.');
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode('vl6-capsule-v1') },
    key, cleartext as BufferSource,
  );
  return {
    format: 'vl6-capsule-v1', kdf: 'PBKDF2-SHA256', iterations: 600_000,
    cipher: 'AES-256-GCM', salt: base64(salt), nonce: base64(nonce),
    ciphertext: base64(new Uint8Array(data)),
  };
}

export async function openCapsule(input: unknown, passphrase: string): Promise<Uint8Array> {
  if (!input || typeof input !== 'object') throw new Error('Pacote inválido.');
  const envelope = input as SealedCapsule;
  if (envelope.format !== 'vl6-capsule-v1' || envelope.kdf !== 'PBKDF2-SHA256' ||
      envelope.iterations !== 600_000 || envelope.cipher !== 'AES-256-GCM' ||
      typeof envelope.salt !== 'string' || typeof envelope.nonce !== 'string' ||
      typeof envelope.ciphertext !== 'string') throw new Error('Formato de pacote não reconhecido.');
  const salt = fromBase64(envelope.salt, 32);
  const nonce = fromBase64(envelope.nonce, 12);
  if (salt.length !== 32 || nonce.length !== 12) throw new Error('Pacote inválido.');
  const ciphertext = fromBase64(envelope.ciphertext, 1024 * 1024 + 16);
  const key = await deriveKey(passphrase, salt);
  try {
    const data = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource, additionalData: encoder.encode('vl6-capsule-v1') },
      key, ciphertext as BufferSource,
    );
    return new Uint8Array(data);
  } catch {
    throw new Error('Frase secreta incorreta ou pacote alterado.');
  }
}

export function encodeLetter(letter: { title: string; body: string; recipient: string }): Uint8Array {
  return encoder.encode(JSON.stringify(letter));
}

export function decodeLetter(cleartext: Uint8Array): { title: string; body: string; recipient: string } {
  const value: unknown = JSON.parse(decoder.decode(cleartext));
  if (!value || typeof value !== 'object') throw new Error('Carta inválida.');
  const letter = value as Record<string, unknown>;
  if (typeof letter.title !== 'string' || typeof letter.body !== 'string' || typeof letter.recipient !== 'string') {
    throw new Error('Carta inválida.');
  }
  return { title: letter.title, body: letter.body, recipient: letter.recipient };
}
