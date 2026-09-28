import { describe, expect, it } from 'vitest';
import { digestInventory, receiptDigest, type SealEntry } from './seal-manifest';

const items: SealEntry[] = [
  { kind: 'letter', id: 'a', uid: 'irmao1', sha256: 'a'.repeat(64), fileId: 'wix1' },
  { kind: 'draft', id: 'irmao2', uid: 'irmao2', sha256: 'b'.repeat(64), fileId: 'wix2' },
];

describe('recibo de lacração', () => {
  it('é estável com inventário ordenado e detecta substituição ou perda', () => {
    const first = digestInventory(items);
    expect(first).toEqual(digestInventory([...items].reverse()));
    expect(first.count).toBe(2);
    expect(first.digest).not.toBe(digestInventory(items.slice(1)).digest);
    expect(first.digest).not.toBe(digestInventory([{ ...items[0]!, sha256: 'c'.repeat(64) }, items[1]!]).digest);
  });
  it('vincula código, data, ata, responsáveis e inventário ao hash do recibo', () => {
    const receipt = { code: 'VL6-20260928-ABCDEF123456', sealedAt: '2026-09-28T12:00:00.000Z',
      inventoryDigest: digestInventory(items).digest, previousCode: null, minutes: 'Ata 25/2026',
      closingMasterId: 'm1', closingSecondId: 'm2' };
    expect(receiptDigest(receipt)).toMatch(/^[a-f0-9]{64}$/);
    expect(receiptDigest(receipt)).not.toBe(receiptDigest({ ...receipt, minutes: 'Ata alterada' }));
  });
});
