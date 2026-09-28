import { createHash } from 'node:crypto';

export type SealEntry = { kind: 'letter' | 'draft'; id: string; uid: string; sha256: string; fileId: string };

export function digestInventory(entries: SealEntry[]) {
  const ordered = [...entries].sort((a, b) => {
    const left = `${a.kind}:${a.uid}:${a.id}`;
    const right = `${b.kind}:${b.uid}:${b.id}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const digest = createHash('sha256').update(JSON.stringify({ format: 'vl6-inventory-v1', entries: ordered })).digest('hex');
  return { digest, count: ordered.length, letters: ordered.filter((entry) => entry.kind === 'letter').length,
    drafts: ordered.filter((entry) => entry.kind === 'draft').length };
}

export function receiptDigest(receipt: { code: string; sealedAt: string; inventoryDigest: string;
  previousCode: string | null; minutes: string; closingMasterId: string; closingSecondId: string;
  commissionMemberIds?: string[]; nextOpeningDate?: string }) {
  const canonical = { code: receipt.code, sealedAt: receipt.sealedAt, inventoryDigest: receipt.inventoryDigest,
    previousCode: receipt.previousCode, minutes: receipt.minutes,
    closingMasterId: receipt.closingMasterId, closingSecondId: receipt.closingSecondId,
    ...(receipt.commissionMemberIds ? { commissionMemberIds: receipt.commissionMemberIds } : {}),
    ...(receipt.nextOpeningDate ? { nextOpeningDate: receipt.nextOpeningDate } : {}) };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
