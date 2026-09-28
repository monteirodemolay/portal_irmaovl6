import { describe, expect, it } from 'vitest';
import { comparePhysicalUnits, inspectPhysicalUnit } from './physical-unit';

const code = 'VL6-20260928-ABCDEF123456';
const inventoryDigest = 'a'.repeat(64);
const bytes = new TextEncoder();

function sample() {
  const head = bytes.encode(JSON.stringify({ formato: 'CRIPTA/2', codigoLacracao: code, totalCartas: 3, inventoryDigest }));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, head.length);
  return new Blob([bytes.encode('CRIPTA02'), length, head, bytes.encode('encrypted-index-and-content'), new Uint8Array(24), bytes.encode('CRIPTAFI')]);
}

describe('conferência física CRIPTA/2', () => {
  it('lê o arquivo selecionado, rejeita corrupção e exige duas unidades distintas', async () => {
    const file = sample();
    const { fingerprintLacre } = await import('./physical-unit');
    const fingerprint = await fingerprintLacre(file);
    const manifest = (unit: string, print = fingerprint) => JSON.stringify({ formato: 'CRIPTA/2', codigoLacracao: code,
      codigoPenDrive: unit, impressaoDigital: print, tamanho: file.size, totalCartas: 3, inventoryDigest });
    const a = await inspectPhysicalUnit(file, manifest('PD-A-ABCDEF123456-01'));
    const b = await inspectPhysicalUnit(file, manifest('PD-B-ABCDEF123456-02'));
    expect(comparePhysicalUnits(a, b, code, 3, inventoryDigest).units).toEqual(['PD-A-ABCDEF123456-01', 'PD-B-ABCDEF123456-02']);
    expect(() => comparePhysicalUnits(a, a, code, 3, inventoryDigest)).toThrow(/distintas/);
    expect(() => comparePhysicalUnits(a, b, code, 4, inventoryDigest)).toThrow(/divergem/);
    expect(() => comparePhysicalUnits(a, b, code, 3, 'b'.repeat(64))).toThrow(/divergem/);
    await expect(inspectPhysicalUnit(file, manifest('PD-B-ABCDEF123456-02', '0'.repeat(64)))).rejects.toThrow(/corrompida/);
    await expect(inspectPhysicalUnit(file, manifest('PD-B-OUTRO-02'))).rejects.toThrow(/não correspondem/);
    await expect(inspectPhysicalUnit(new Blob([bytes.encode('CRIPTA01'), await file.slice(8).arrayBuffer()]), manifest('PD-B-ABCDEF123456-02')))
      .rejects.toThrow(/CRIPTA\/2/);
  });
});
