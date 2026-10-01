import 'server-only';
import { resetControlRef } from './reset-control';
import { isReceivingWindowOpen } from './receiving-window';
import { getAdminFirestore } from '@vl6/infra';

export function openingRef(tenantId: string) {
  return getAdminFirestore().collection('criptaOnlineOpeningV1').doc(tenantId);
}

export async function isOnlineOpen(tenantId: string): Promise<boolean> {
  const control = (await resetControlRef(tenantId).get()).data();
  if (control?.state && control.state !== 'idle') return false;
  const snapshot = await openingRef(tenantId).get();
  return isReceivingWindowOpen(snapshot.data());
}
