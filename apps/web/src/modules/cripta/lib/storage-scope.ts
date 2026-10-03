import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';

export const criptaStorageScope = new AsyncLocalStorage<{ tenantId: string; uid: string }>();

/** Keep every known upload addressable even if a later write/compensation fails.
 * No ciphertext or signed URL is persisted here. Reset removes this ledger last
 * with the other metadata after verifying all referenced Wix objects are absent. */
export async function trackCriptaUpload(fileId: string) {
  const scope = criptaStorageScope.getStore();
  if (!scope) return;
  const id = createHash('sha256')
    .update(JSON.stringify([scope.tenantId, fileId]))
    .digest('hex');
  await getAdminFirestore()
    .collection('criptaStorageObjectsV1')
    .doc(id)
    .set({
      ...scope,
      fileId,
      createdAt: new Date().toISOString(),
    });
}
