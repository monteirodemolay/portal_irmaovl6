import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import { isOnlineOpen, openingRef } from './online-opening';
import { readCriptaPublicKey } from './cripta-crypto-state';
import { computeCycleStatus, type WizardResult } from './cycle-wizard';

/** The single place that turns stored Cripta state into the wizard's current phase — shared by
 * the Administração page and the Projetor, so the two screens can never disagree about which
 * cerimônia is live right now. */
export async function currentWizardStatus(tenantId: string): Promise<WizardResult> {
  const db = getAdminFirestore();
  const [open, openingDoc, governance, seal, inauguration] = await Promise.all([
    isOnlineOpen(tenantId),
    openingRef(tenantId).get(),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    db.collection('criptaSealsV1').doc(tenantId).get(),
    readCriptaPublicKey(tenantId),
  ]);
  const control = governance.data();
  const sealData = seal.data();
  return computeCycleStatus({
    inaugurated: !!inauguration,
    hasCommission: !!control?.commissionMemberIds?.length,
    open,
    everOpened: typeof openingDoc.data()?.openedAt === 'string',
    closesAt: openingDoc.data()?.closesAt ?? null,
    receiptStatus: sealData?.status ?? null,
    receiptCode: sealData?.code ?? null,
    exportReceiptCode: sealData?.export?.receiptCode ?? null,
    physicalCheckOk:
      sealData?.physicalCheck?.receiptDigest === sealData?.receiptDigest &&
      (sealData?.physicalCheck?.units?.length ?? 0) >= 3,
    cleanupOk:
      sealData?.cleanup?.receiptCode === sealData?.code && sealData?.cleanup?.complete === true,
    restorationOk:
      sealData?.restoration?.receiptCode === sealData?.code &&
      sealData?.restoration?.complete === true,
  });
}
