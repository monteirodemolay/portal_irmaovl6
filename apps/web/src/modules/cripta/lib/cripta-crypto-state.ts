import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import type { CriptaPublicKey } from './cripta-key';

export type CriptaCryptoState = {
  publicKey: CriptaPublicKey;
  totalGuardians: number;
  threshold: number;
  guardianMemberIds: string[];
  minutes: string;
  masterId: string;
  inauguratedAt: string;
};

export function criptaCryptoRef(tenantId: string) {
  return getAdminFirestore().collection('criptaCryptoV1').doc(tenantId);
}

export async function readCriptaPublicKey(tenantId: string): Promise<CriptaCryptoState | null> {
  const snap = await criptaCryptoRef(tenantId).get();
  const data = snap.data();
  if (!data || !data.publicKey || !data.inauguratedAt) return null;
  return data as CriptaCryptoState;
}
