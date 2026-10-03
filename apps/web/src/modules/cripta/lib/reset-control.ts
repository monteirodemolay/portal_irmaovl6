import 'server-only';
import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';

// Every protected route has maxDuration <= 300 seconds. Keep a threefold margin
// before considering a lease left by a terminated serverless invocation abandoned.
export const OPERATION_LEASE_MS = 15 * 60_000;
export type ResetControl = {
  generation?: number;
  state?: 'idle' | 'draining' | 'resetting';
  operations?: Record<string, number>;
  resetId?: string;
  ownerUid?: string;
  completed?: number;
  startedAt?: string;
  completedAt?: string;
  workerId?: string;
  workerUntil?: number;
};
export const resetControlRef = (tenantId: string) =>
  getAdminFirestore().collection('criptaResetControlV1').doc(tenantId);
export class CriptaBlocked extends Error {}
export class CriptaStaleCycle extends Error {}
export const liveOperations = (control: ResetControl, now = Date.now()) =>
  Object.fromEntries(Object.entries(control.operations ?? {}).filter(([, until]) => until > now));

/** Admission and reset start both transact on the SAME document. Reset drains
 * already admitted work before deleting anything, including uploads and compensation. */
export async function acquireCriptaOperation(tenantId: string, expectedGeneration?: number) {
  const ref = resetControlRef(tenantId);
  const id = randomUUID();
  const generation = await getAdminFirestore().runTransaction(async (tx) => {
    const control = ((await tx.get(ref)).data() ?? {}) as ResetControl;
    if (control.state && control.state !== 'idle')
      throw new CriptaBlocked('A Cripta está sendo zerada. Aguarde a conclusão na Administração.');
    const generation = control.generation ?? 0;
    if (expectedGeneration !== undefined && expectedGeneration !== generation)
      throw new CriptaStaleCycle(
        'Este rascunho pertence a um ciclo anterior. Atualize a página para começar de novo.',
      );
    tx.set(ref, {
      ...control,
      operations: { ...liveOperations(control), [id]: Date.now() + OPERATION_LEASE_MS },
    });
    return generation;
  });
  return {
    generation,
    release: () =>
      getAdminFirestore().runTransaction(async (tx) => {
        const control = ((await tx.get(ref)).data() ?? {}) as ResetControl;
        const operations = { ...control.operations };
        delete operations[id];
        tx.set(ref, { ...control, operations });
      }),
  };
}

export async function withCriptaOperation<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  const operation = await acquireCriptaOperation(tenantId);
  try {
    return await work();
  } finally {
    await operation.release();
  }
}
