import { describe, expect, it } from 'vitest';
import { buildLacreFile, encodeEntries, type LacreEntry } from './lacre-format';

const code = 'VL6-20260928-ABCDEF123456';
const digest = 'a'.repeat(64);

describe('CRIPTA/2 export file format', () => {
  it('builds a file whose header, payload and trailer round-trip through the same parsing the browser check uses', async () => {
    const entries: LacreEntry[] = [
      { kind: 'letter', id: 'l1', uid: 'u1', sha256: 'b'.repeat(64), bytes: new TextEncoder().encode('{"format":"vl6-cripta-seal-v1"}') },
      { kind: 'draft', id: 'u2', uid: 'u2', sha256: 'c'.repeat(64), bytes: new Uint8Array([1, 2, 3, 255, 0]) },
    ];
    const payload = encodeEntries(entries);
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 }, payload);

    // Parse it back exactly the way apps/web/.../physical-unit.ts#inspectPhysicalUnit does.
    const decoder = new TextDecoder('utf-8', { fatal: true });
    expect(decoder.decode(file.slice(0, 8))).toBe('CRIPTA02');
    const length = new DataView(file.buffer, file.byteOffset + 8, 4).getUint32(0);
    const header = JSON.parse(decoder.decode(file.slice(12, 12 + length))) as Record<string, unknown>;
    expect(header).toEqual({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 });
    expect(decoder.decode(file.slice(file.length - 8))).toBe('CRIPTAFI');

    const body = decoder.decode(file.slice(12 + length, file.length - 8));
    const lines = body.trim().split('\n').map((line) => JSON.parse(line) as { kind: string; id: string; uid: string; sha256: string; bytes: string });
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.kind).sort()).toEqual(['draft', 'letter']);
    const restoredDraft = lines.find((line) => line.kind === 'draft')!;
    expect(Uint8Array.from(Buffer.from(restoredDraft.bytes, 'base64'))).toEqual(entries[1]!.bytes);
    const restoredLetter = lines.find((line) => line.kind === 'letter')!;
    expect(new TextDecoder().decode(Buffer.from(restoredLetter.bytes, 'base64'))).toBe('{"format":"vl6-cripta-seal-v1"}');
  });

  it('keeps entry order deterministic regardless of input order', () => {
    const a: LacreEntry = { kind: 'letter', id: '2', uid: 'z', sha256: 'd'.repeat(64), bytes: new Uint8Array([1]) };
    const b: LacreEntry = { kind: 'letter', id: '1', uid: 'a', sha256: 'e'.repeat(64), bytes: new Uint8Array([2]) };
    expect(encodeEntries([a, b])).toEqual(encodeEntries([b, a]));
  });

  it('rejects a malformed header', () => {
    expect(() => buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: 'not-a-valid-code', inventoryDigest: digest, totalCartas: 1 }, new Uint8Array()))
      .toThrow(/lacração/);
    expect(() => buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: 'too-short', totalCartas: 1 }, new Uint8Array()))
      .toThrow(/[Dd]igesto/);
    expect(() => buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: -1 }, new Uint8Array()))
      .toThrow(/[Tt]otal/);
  });

  it('handles an empty inventory (zero letters, zero drafts)', () => {
    const payload = encodeEntries([]);
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 0 }, payload);
    expect(file.length).toBeGreaterThan(0);
  });
});
