import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import type { VaultWindow } from './operation-policy';

type CapsuleRecord = {
  status: 'pending' | 'ready' | 'deleting';
  fileId?: string;
  sha256?: string;
  bytes?: number;
  createdAt: string;
};

const db = () => getAdminFirestore();
const owner = (uid: string) => db().collection('criptaPilotV1').doc(uid);

export async function readWindow(): Promise<VaultWindow | null> {
  const snap = await db().collection('criptaControlV1').doc('pilot').get();
  const value = snap.data();
  if (!value || typeof value.opensAt !== 'string' || typeof value.closesAt !== 'string' ||
      !['open', 'closed', 'scheduled'].includes(value.status)) return null;
  return { opensAt: value.opensAt, closesAt: value.closesAt, status: value.status as VaultWindow['status'] };
}

export async function reserveCapsule(uid: string, id: string): Promise<void> {
  const inventory = owner(uid);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(inventory);
    const count = Number(snap.data()?.count ?? 0);
    if (!Number.isInteger(count) || count < 0 || count >= 5) throw new Error('Limite de cinco cartas atingido.');
    const reference = inventory.collection('capsules').doc(id);
    tx.set(inventory, { count: count + 1, updatedAt: new Date().toISOString() }, { merge: true });
    tx.create(reference, { status: 'pending', createdAt: new Date().toISOString() } satisfies CapsuleRecord);
  });
}

export async function finalizeCapsule(uid: string, id: string, fileId: string, sha256: string, bytes: number): Promise<void> {
  const reference = owner(uid).collection('capsules').doc(id);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(reference);
    if (snap.data()?.status !== 'pending') throw new Error('Reserva inválida.');
    tx.update(reference, { status: 'ready', fileId, sha256, bytes });
  });
}

export async function cancelReservation(uid: string, id: string): Promise<void> {
  const inventory = owner(uid);
  const reference = inventory.collection('capsules').doc(id);
  await db().runTransaction(async (tx) => {
    const [capsule, parent] = await Promise.all([tx.get(reference), tx.get(inventory)]);
    if (capsule.data()?.status !== 'pending') return;
    tx.delete(reference);
    tx.set(inventory, { count: Math.max(0, Number(parent.data()?.count ?? 1) - 1) }, { merge: true });
  });
}

export async function listCapsules(uid: string): Promise<Array<{ id: string; createdAt: string; bytes: number }>> {
  const items = await owner(uid).collection('capsules').get();
  return items.docs.filter((snap) => snap.data().status === 'ready').map((snap) => ({
    id: snap.id, createdAt: snap.data().createdAt as string, bytes: snap.data().bytes as number,
  }));
}

export async function getCapsule(uid: string, id: string): Promise<CapsuleRecord | null> {
  const snap = await owner(uid).collection('capsules').doc(id).get();
  const data = snap.data() as CapsuleRecord | undefined;
  return data?.status === 'ready' ? data : null;
}

export async function removeCapsuleRecord(uid: string, id: string, fileId: string): Promise<void> {
  const inventory = owner(uid);
  const reference = inventory.collection('capsules').doc(id);
  await db().runTransaction(async (tx) => {
    const [capsule, parent] = await Promise.all([tx.get(reference), tx.get(inventory)]);
    if (capsule.data()?.fileId !== fileId || capsule.data()?.status !== 'ready') throw new Error('Registro alterado.');
    tx.delete(reference);
    tx.set(inventory, { count: Math.max(0, Number(parent.data()?.count ?? 1) - 1) }, { merge: true });
  });
}
