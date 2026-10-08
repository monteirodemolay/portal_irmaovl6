import { describe, expect, it } from 'vitest';
import { resolveExpectedInventory, type SealReceipt } from './reopen-check';

const base: SealReceipt = { code: 'VL6-20260929-AAAA', status: 'sealed', inventoryDigest: 'digest-original', count: 5 };

describe('resolveExpectedInventory', () => {
  it('returns null when there is no receipt or it is not sealed', () => {
    expect(resolveExpectedInventory(null)).toBeNull();
    expect(resolveExpectedInventory(undefined)).toBeNull();
    expect(resolveExpectedInventory({ ...base, status: 'opened' })).toBeNull();
  });

  it('expects the original sealed digest when cleanup never ran', () => {
    expect(resolveExpectedInventory(base)).toEqual({ digest: 'digest-original', count: 5 });
  });

  it('still expects the original digest when cleanup exists but is for a different (earlier) receipt', () => {
    const receipt: SealReceipt = { ...base, cleanup: { receiptCode: 'VL6-OLD', complete: true } };
    expect(resolveExpectedInventory(receipt)).toEqual({ digest: 'digest-original', count: 5 });
  });

  it('returns null after cleanup when no restoration has been recorded yet', () => {
    const receipt: SealReceipt = { ...base, cleanup: { receiptCode: base.code, complete: true } };
    expect(resolveExpectedInventory(receipt)).toBeNull();
  });

  it('returns null after cleanup when restoration failed partially', () => {
    const receipt: SealReceipt = {
      ...base,
      cleanup: { receiptCode: base.code, complete: true },
      restoration: { receiptCode: base.code, complete: false, inventoryDigest: 'digest-restored', inventoryCount: 2 },
    };
    expect(resolveExpectedInventory(receipt)).toBeNull();
  });

  it('returns null after cleanup when restoration is for a stale, different receipt code', () => {
    const receipt: SealReceipt = {
      ...base,
      cleanup: { receiptCode: base.code, complete: true },
      restoration: { receiptCode: 'VL6-OLD', complete: true, inventoryDigest: 'digest-restored', inventoryCount: 2 },
    };
    expect(resolveExpectedInventory(receipt)).toBeNull();
  });

  it('expects the fresh restored digest (never the original) once cleanup and restoration both completed', () => {
    const receipt: SealReceipt = {
      ...base,
      cleanup: { receiptCode: base.code, complete: true },
      restoration: { receiptCode: base.code, complete: true, inventoryDigest: 'digest-restored', inventoryCount: 2 },
    };
    expect(resolveExpectedInventory(receipt)).toEqual({ digest: 'digest-restored', count: 2 });
  });

  it('never falls back to the original digest once cleanup ran, even if restoration omits its own digest', () => {
    const receipt: SealReceipt = {
      ...base,
      cleanup: { receiptCode: base.code, complete: true },
      // Malformed/partial restoration record — must not silently accept the (now meaningless) original digest.
      restoration: { receiptCode: base.code, complete: true } as SealReceipt['restoration'],
    };
    expect(resolveExpectedInventory(receipt)).toBeNull();
  });
});
