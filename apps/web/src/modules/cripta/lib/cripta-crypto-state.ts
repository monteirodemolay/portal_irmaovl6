import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import type { CriptaPublicKey } from './cripta-key';
import type { GuardianShare } from './guardian-shares-shape';

export type CriptaCryptoState = {
  publicKey: CriptaPublicKey;
  totalGuardians: number;
  threshold: number;
  guardianMemberIds: string[];
  minutes: string;
  masterId: string;
  inauguratedAt: string;
  /** Opcional por compatibilidade com estados gravados antes deste rastreamento existir —
   * ver guardian-shares.ts:currentGuardianShares para o fallback. */
  guardianShares?: GuardianShare[];
  guardianShareDigests?: string[];
  /** Presentes só depois de ao menos uma Renovação de Guardiões (ver /api/cripta/renewal).
   * `inauguratedAt`/`masterId` continuam sempre se referindo ao ato único original. */
  lastRenewedAt?: string;
  renewalCount?: number;
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
