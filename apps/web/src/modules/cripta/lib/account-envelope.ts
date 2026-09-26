import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';

type Envelope = { format: 'vl6-account-letter-v1'; nonce: string; tag: string; ciphertext: string };

async function accountKey(tenantId: string, uid: string, createIfMissing: boolean): Promise<Buffer> {
  const ref = getAdminFirestore().collection('criptaAccountKeysV1').doc(tenantId).collection('users').doc(uid);
  let snap = await ref.get();
  if (!snap.exists && createIfMissing) {
    try { await ref.create({ key: randomBytes(32).toString('base64'), createdAt: new Date().toISOString() }); }
    catch (error) {
      if ((error as { code?: number }).code !== 6) throw error;
    }
    snap = await ref.get();
  }
  const encoded = snap.data()?.key;
  if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error('Chave da conta indisponível.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('Chave da conta inválida.');
  return key;
}

function aad(tenantId: string, uid: string, id: string) {
  return Buffer.from(JSON.stringify([tenantId, uid, id]), 'utf8');
}

export async function sealForAccount(plaintext: Buffer, tenantId: string, uid: string, id: string): Promise<Buffer> {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', await accountKey(tenantId, uid, true), nonce);
  cipher.setAAD(aad(tenantId, uid, id));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope: Envelope = { format: 'vl6-account-letter-v1', nonce: nonce.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  return Buffer.from(JSON.stringify(envelope), 'utf8');
}

export async function openForAccount(encrypted: Buffer, tenantId: string, uid: string, id: string): Promise<Buffer> {
  const envelope = JSON.parse(encrypted.toString('utf8')) as Envelope;
  if (envelope.format !== 'vl6-account-letter-v1' ||
      ![envelope.nonce, envelope.tag, envelope.ciphertext].every((value) => typeof value === 'string')) throw new Error('Formato inválido.');
  const nonce = Buffer.from(envelope.nonce, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  if (nonce.length !== 12 || tag.length !== 16 || envelope.ciphertext.length > 2_000_000) throw new Error('Pacote inválido.');
  const decipher = createDecipheriv('aes-256-gcm', await accountKey(tenantId, uid, false), nonce);
  decipher.setAAD(aad(tenantId, uid, id));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
}
