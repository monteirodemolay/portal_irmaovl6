import 'server-only';
import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';
import {
  resetControlRef,
  liveOperations,
  OPERATION_LEASE_MS,
  type ResetControl,
} from './reset-control';
import { resetInventory } from './reset-inventory';
import { deleteAndVerifyPrivateCiphertext } from './wix-private-files';

export async function readResetStatus(tenantId: string, uid: string) {
  const control = ((await resetControlRef(tenantId).get()).data() ?? {}) as ResetControl;
  const inventory = await resetInventory(
    tenantId,
    control.state && control.state !== 'idle' ? (control.ownerUid ?? uid) : uid,
  );
  return {
    generation: control.generation ?? 0,
    state: control.state ?? 'idle',
    resetId: control.resetId ?? null,
    completed: control.completed ?? 0,
    completedAt: control.completedAt ?? null,
    activeOperations: Object.keys(liveOperations(control)).length,
    ...inventory.summary,
  };
}

export async function startReset(tenantId: string, uid: string, generation: number) {
  const ref = resetControlRef(tenantId);
  return getAdminFirestore().runTransaction(async (tx) => {
    const control = ((await tx.get(ref)).data() ?? {}) as ResetControl;
    if ((control.generation ?? 0) !== generation || (control.state && control.state !== 'idle'))
      throw new Error('O estado da Cripta mudou. Atualize a conferência antes de zerar.');
    const resetId = randomUUID();
    tx.set(ref, {
      ...control,
      generation: generation + 1,
      state: 'draining',
      resetId,
      ownerUid: uid,
      startedAt: new Date().toISOString(),
      workerId: '',
      workerUntil: 0,
    });
    // The control lock closes admission immediately, even while an old operation drains.
    return resetId;
  });
}

/** Small resumable batches; metadata and keys remain until ALL Wix files are confirmed
 * absent. A persisted worker lease prevents two requests from executing the same batch. */
export async function continueReset(tenantId: string, uid: string, resetId: string) {
  const db = getAdminFirestore();
  const ref = resetControlRef(tenantId);
  const workerId = randomUUID();
  const admitted = await db.runTransaction(async (tx) => {
    const control = ((await tx.get(ref)).data() ?? {}) as ResetControl;
    if (control.resetId !== resetId)
      throw new Error('Esta zerada não é mais a vigente. Atualize a tela.');
    if (control.state === 'idle') return null; // Retried completion is idempotent.
    if (Object.keys(liveOperations(control)).length || (control.workerUntil ?? 0) > Date.now())
      return null;
    tx.set(ref, {
      ...control,
      state: 'resetting',
      operations: {},
      workerId,
      workerUntil: Date.now() + OPERATION_LEASE_MS,
    });
    return control.ownerUid ?? uid;
  });
  if (!admitted) return { ...(await readResetStatus(tenantId, uid)), waiting: true, failed: 0 };
  let failed = 0;
  try {
    const inventory = await resetInventory(tenantId, admitted);
    // Keep the inventory documents on failure. Retrying an already-deleted object is safe.
    for (const fileId of inventory.files.slice(0, 3)) {
      try {
        await deleteAndVerifyPrivateCiphertext(fileId);
        const references = inventory.docs.filter((doc) => doc.data()?.fileId === fileId);
        for (let offset = 0; offset < references.length; offset += 400) {
          const batch = db.batch();
          for (const doc of references.slice(offset, offset + 400))
            batch.update(doc.ref, { fileId: null });
          await batch.commit();
        }
      } catch {
        failed++;
      }
    }
    if (inventory.files.length === 0) {
      // Children first, keys last. Never delete the reset control (generation fence).
      const ordered = [...inventory.docs].sort((a, b) => {
        const key = (path: string) =>
          /^(criptaAccountKeysV1|criptaCryptoV1)\//.test(path) ? 1 : 0;
        return (
          key(a.ref.path) - key(b.ref.path) ||
          b.ref.path.split('/').length - a.ref.path.split('/').length
        );
      });
      const batch = db.batch();
      for (const doc of ordered.slice(0, 100)) batch.delete(doc.ref);
      if (ordered.length) await batch.commit();
      else
        await db.runTransaction(async (tx) => {
          const control = ((await tx.get(ref)).data() ?? {}) as ResetControl;
          if (control.resetId !== resetId || control.workerId !== workerId)
            throw new Error('Zerada alterada.');
          tx.set(ref, {
            generation: control.generation,
            state: 'idle',
            operations: {},
            resetId,
            completed: (control.completed ?? 0) + 1,
            completedAt: new Date().toISOString(),
          });
        });
    }
  } finally {
    await db.runTransaction(async (tx) => {
      const control = ((await tx.get(ref)).data() ?? {}) as ResetControl;
      if (control.workerId === workerId) tx.set(ref, { ...control, workerId: '', workerUntil: 0 });
    });
  }
  return { ...(await readResetStatus(tenantId, uid)), waiting: false, failed };
}
