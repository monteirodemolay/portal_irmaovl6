import { createHash, webcrypto } from 'node:crypto';
import type { CriptaSealedEnvelope } from './cripta-key';

export const MAX_SEALED_REQUEST_BYTES = 4_400_000;
export const MAX_LETTERS = 5;

/** Stable per owner and exact ciphertext; replay after a lost response returns the same receipt. */
export function sealedRequestId(tenantId: string, uid: string, body: string): string {
  const hex = createHash('sha256').update(JSON.stringify([tenantId, uid, body])).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function canonicalBase64Url(value: unknown, bytes?: number): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.toString('base64url') === value && (bytes === undefined || decoded.length === bytes);
}

export async function validateSealedRequest(value: unknown): Promise<CriptaSealedEnvelope | null> {
  if (!value || typeof value !== 'object') return null;
  const envelope = value as Record<string, unknown>;
  const key = envelope.ephemeralPublicKey as Record<string, unknown> | undefined;
  if (Object.keys(envelope).sort().join(',') !== 'ciphertext,ephemeralPublicKey,format,nonce' ||
      envelope.format !== 'vl6-cripta-seal-v1' || !canonicalBase64Url(envelope.nonce, 12) ||
      !canonicalBase64Url(envelope.ciphertext) || Buffer.from(envelope.ciphertext, 'base64url').length < 17 ||
      !key || Object.keys(key).sort().join(',') !== 'crv,kty,x,y' ||
      key.kty !== 'EC' || key.crv !== 'P-256' || !canonicalBase64Url(key.x, 32) || !canonicalBase64Url(key.y, 32)) return null;
  try {
    await webcrypto.subtle.importKey('jwk', key, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return value as CriptaSealedEnvelope;
  } catch { return null; }
}
