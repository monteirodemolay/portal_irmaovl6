import { describe, expect, it } from 'vitest';
import { buildLacreFile, encodeEntries, parseLacreFile, type LacreEntry } from './lacre-format';

const code = 'VL6-20260928-ABCDEF123456';
const digest = 'a'.repeat(64);

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sampleEntries(): Promise<LacreEntry[]> {
  const letterBytes = new TextEncoder().encode('{"format":"vl6-cripta-seal-v1"}');
  const draftBytes = new Uint8Array([1, 2, 3, 255, 0]);
  return [
    { kind: 'letter', id: 'l1', uid: 'u1', sha256: await sha256Hex(letterBytes), bytes: letterBytes },
    { kind: 'draft', id: 'u2', uid: 'u2', sha256: await sha256Hex(draftBytes), bytes: draftBytes },
  ];
}

describe('CRIPTA/2 export file format', () => {
  it('builds a file whose header, payload and trailer round-trip through the same low-level parsing the browser check uses', async () => {
    const entries = await sampleEntries();
    const payload = encodeEntries(entries);
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 }, payload);

    const decoder = new TextDecoder('utf-8', { fatal: true });
    expect(decoder.decode(file.slice(0, 8))).toBe('CRIPTA02');
    const length = new DataView(file.buffer, file.byteOffset + 8, 4).getUint32(0);
    const header = JSON.parse(decoder.decode(file.slice(12, 12 + length))) as Record<string, unknown>;
    expect(header).toEqual({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 });
    expect(decoder.decode(file.slice(file.length - 8))).toBe('CRIPTAFI');
  });

  it('parseLacreFile is the exact inverse of buildLacreFile + encodeEntries', async () => {
    const entries = await sampleEntries();
    const payload = encodeEntries(entries);
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 }, payload);

    const parsed = await parseLacreFile(file);
    expect(parsed.header).toEqual({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 });
    expect(parsed.entries).toHaveLength(2);
    const draft = parsed.entries.find((entry) => entry.kind === 'draft')!;
    expect(draft.bytes).toEqual(entries[1]!.bytes);
    const letter = parsed.entries.find((entry) => entry.kind === 'letter')!;
    expect(new TextDecoder().decode(letter.bytes)).toBe('{"format":"vl6-cripta-seal-v1"}');
  });

  it('detects a corrupted entry (bytes tampered after writing) instead of silently returning bad data', async () => {
    const entries = await sampleEntries();
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 }, encodeEntries(entries));
    // Flip a byte inside the body region (after the header, before the trailer).
    const tampered = new Uint8Array(file);
    const index = tampered.length - 20;
    tampered[index] = (tampered[index] ?? 0) ^ 0xff;
    await expect(parseLacreFile(tampered)).rejects.toThrow();
  });

  it('rejects a file with the wrong magic, a missing trailer, or a letter count that does not match the header', async () => {
    const entries = await sampleEntries();
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 1 }, encodeEntries(entries));
    await expect(parseLacreFile(new TextEncoder().encode('CRIPTA01' + 'x'.repeat(50)))).rejects.toThrow(/CRIPTA\/2|desconhecido/);
    await expect(parseLacreFile(file.slice(0, file.length - 8))).rejects.toThrow(/incompleto|corrompido/);
    const wrongCount = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 5 }, encodeEntries(entries));
    await expect(parseLacreFile(wrongCount)).rejects.toThrow(/número de cartas/);
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

  it('handles an empty inventory (zero letters, zero drafts)', async () => {
    const payload = encodeEntries([]);
    const file = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest: digest, totalCartas: 0 }, payload);
    expect(file.length).toBeGreaterThan(0);
    const parsed = await parseLacreFile(file);
    expect(parsed.entries).toEqual([]);
  });
});
