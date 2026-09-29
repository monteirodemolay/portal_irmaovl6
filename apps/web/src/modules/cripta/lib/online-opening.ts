import 'server-only';
import { getAdminFirestore } from '@vl6/infra';

export function openingRef(tenantId: string) {
  return getAdminFirestore().collection('criptaOnlineOpeningV1').doc(tenantId);
}

export async function isOnlineOpen(tenantId: string): Promise<boolean> {
  const snapshot = await openingRef(tenantId).get();
  return snapshot.exists ? snapshot.data()?.open === true : true;
}
