/** The Cripta's own keypair (ECDH P-256). Any letter is sealed with the PUBLIC key alone —
 * the member never enters a passphrase. The PRIVATE key is only ever assembled, briefly, by
 * a quorum of Guardiões reconstructing it from their Shamir shares (see shamir.ts); it is
 * never stored whole anywhere in the Portal or its infrastructure. */

export type CriptaPublicKey = { kty: 'EC'; crv: 'P-256'; x: string; y: string };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/** Generated once, in the browser, during the closed inauguration session. The private key
 * this returns must be split with shamir.ts and then discarded — never uploaded whole. */
export async function generateCriptaKeypair(): Promise<{ publicKey: CriptaPublicKey; privateScalar: Uint8Array }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey) as JsonWebKey;
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey) as JsonWebKey;
  if (!publicJwk.x || !publicJwk.y || !privateJwk.d) throw new Error('Falha ao gerar a chave da Cripta.');
  return {
    publicKey: { kty: 'EC', crv: 'P-256', x: publicJwk.x, y: publicJwk.y },
    privateScalar: fromBase64Url(privateJwk.d),
  };
}

async function importPublicKey(publicKey: CriptaPublicKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', { ...publicKey, ext: true, key_ops: [] },
    { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

/** Rebuild the full private key from the reconstructed 32-byte scalar plus the (non-secret) public key. */
async function importPrivateKey(privateScalar: Uint8Array, publicKey: CriptaPublicKey): Promise<CryptoKey> {
  if (privateScalar.length !== 32) throw new Error('Chave privada reconstruída com tamanho inválido.');
  return crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: publicKey.x, y: publicKey.y,
    d: toBase64Url(privateScalar), ext: true, key_ops: ['deriveBits'] },
    { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
}

export type CriptaSealedEnvelope = {
  format: 'vl6-cripta-seal-v1';
  ephemeralPublicKey: CriptaPublicKey;
  nonce: string;
  ciphertext: string;
};

/** Seals data for the Cripta's public key alone (ECIES-style: ephemeral ECDH + HKDF + AES-256-GCM).
 * No passphrase, no server-held secret — only the private key (held by no one, only reconstructible
 * by Guardiões) can ever open this. */
export async function sealForCripta(plaintext: Uint8Array, publicKey: CriptaPublicKey): Promise<CriptaSealedEnvelope> {
  const recipientKey = await importPublicKey(publicKey);
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipientKey }, ephemeral.privateKey, 256);
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode('vl6-cripta-seal-v1') },
    hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext as BufferSource);
  const ephemeralJwk = await crypto.subtle.exportKey('jwk', ephemeral.publicKey) as JsonWebKey;
  if (!ephemeralJwk.x || !ephemeralJwk.y) throw new Error('Falha ao cifrar para a Cripta.');
  return {
    format: 'vl6-cripta-seal-v1',
    ephemeralPublicKey: { kty: 'EC', crv: 'P-256', x: ephemeralJwk.x, y: ephemeralJwk.y },
    nonce: toBase64Url(nonce),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  };
}

/** Opens an envelope. Only callable once the Guardiões have reconstructed the private scalar. */
export async function openWithCriptaPrivateKey(envelope: CriptaSealedEnvelope, privateScalar: Uint8Array,
  publicKey: CriptaPublicKey): Promise<Uint8Array> {
  if (envelope.format !== 'vl6-cripta-seal-v1') throw new Error('Formato de pacote não reconhecido.');
  const privateKey = await importPrivateKey(privateScalar, publicKey);
  const ephemeralKey = await importPublicKey(envelope.ephemeralPublicKey);
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: ephemeralKey }, privateKey, 256);
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode('vl6-cripta-seal-v1') },
    hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  const nonce = fromBase64Url(envelope.nonce);
  const ciphertext = fromBase64Url(envelope.ciphertext);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, aesKey, ciphertext as BufferSource);
    return new Uint8Array(plaintext);
  } catch {
    throw new Error('Não foi possível abrir o pacote com a chave reconstruída.');
  }
}
