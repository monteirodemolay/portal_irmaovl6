import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import { digestInventory, type SealEntry } from './seal-manifest';

export const sealRef = (tenantId: string) => getAdminFirestore().collection('criptaSealsV1').doc(tenantId);

/** Inventory of registered ciphertext objects; no plaintext, names or recipients are read. */
export async function currentInventory(tenantId: string) {
  const db = getAdminFirestore();
  const [letters, drafts] = await Promise.all([
    db.collection('criptaOnlineCapsulesV1').get(),
    db.collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').get(),
  ]);
  const entries: SealEntry[] = [];
  for (const doc of letters.docs) {
    const data = doc.data();
    if (data.tenantId !== tenantId || data.status !== 'ready') continue;
    if (typeof data.sha256 !== 'string' || typeof data.fileId !== 'string' || typeof data.uid !== 'string') {
      throw new Error('Inventário de cartas incompleto. Corrija antes de lacrar.');
    }
    entries.push({ kind: 'letter', id: doc.id, uid: data.uid, sha256: data.sha256, fileId: data.fileId });
  }
  for (const doc of drafts.docs) {
    const data = doc.data();
    if (typeof data.sha256 !== 'string' || typeof data.fileId !== 'string') {
      throw new Error('Inventário de rascunhos incompleto. Corrija antes de lacrar.');
    }
    entries.push({ kind: 'draft', id: doc.id, uid: doc.id, sha256: data.sha256, fileId: data.fileId });
  }
  return digestInventory(entries);
}
