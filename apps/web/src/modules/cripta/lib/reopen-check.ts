export type SealReceipt = {
  code: string;
  status: string;
  inventoryDigest: string;
  count: number;
  cleanup?: { receiptCode?: string; complete?: boolean };
  restoration?: { receiptCode?: string; inventoryDigest?: string; inventoryCount?: number; complete?: boolean };
};

/** Decides what the live online inventory must match before the writing window can reopen.
 *
 * Two cases: the receipt's own digest was frozen at lacração time, over the letters and drafts
 * that were online *then* — including their Wix fileIds. If the Wix cleanup never ran (a same-day
 * mistaken closure), that inventory is still sitting there untouched, so it's still the right
 * thing to match. But once cleanup deletes those objects, their fileIds are gone for good — the
 * original digest can never be reproduced again, cleared letters included, because letters never
 * come back online at all (see restore route). The only thing that CAN legitimately reappear is
 * drafts, re-uploaded under new fileIds by the restore route, which freezes a fresh digest right
 * after doing so — that is what reopening must match instead. */
export function resolveExpectedInventory(receipt: SealReceipt | null | undefined): { digest: string; count: number } | null {
  if (!receipt || receipt.status !== 'sealed') return null;
  const cleaned = receipt.cleanup?.receiptCode === receipt.code && receipt.cleanup?.complete === true;
  if (!cleaned) return { digest: receipt.inventoryDigest, count: receipt.count };
  const restoration = receipt.restoration;
  if (restoration?.receiptCode !== receipt.code || restoration.complete !== true) return null;
  if (typeof restoration.inventoryDigest !== 'string' || typeof restoration.inventoryCount !== 'number') return null;
  return { digest: restoration.inventoryDigest, count: restoration.inventoryCount };
}
