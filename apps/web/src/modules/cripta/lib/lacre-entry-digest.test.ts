import { describe, expect, it } from 'vitest';
import { digestLacreEntries } from './lacre-entry-digest';

describe('digestLacreEntries', () => {
  it('is deterministic and independent of input order', async () => {
    const a = { kind: 'letter' as const, id: '1', uid: 'u1', sha256: 'a'.repeat(64) };
    const b = { kind: 'draft' as const, id: '2', uid: 'u2', sha256: 'b'.repeat(64) };
    const forward = await digestLacreEntries([a, b]);
    const reversed = await digestLacreEntries([b, a]);
    expect(forward).toBe(reversed);
    expect(forward).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes when any entry changes', async () => {
    const a = { kind: 'letter' as const, id: '1', uid: 'u1', sha256: 'a'.repeat(64) };
    const changed = { ...a, sha256: 'c'.repeat(64) };
    expect(await digestLacreEntries([a])).not.toBe(await digestLacreEntries([changed]));
  });

  it('empty list has a stable digest', async () => {
    expect(await digestLacreEntries([])).toMatch(/^[a-f0-9]{64}$/);
  });
});
