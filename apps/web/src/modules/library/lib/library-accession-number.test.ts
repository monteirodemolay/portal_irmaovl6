import { describe, expect, it } from 'vitest';
import { generateLibraryAccessionNumber } from './library-accession-number';

describe('generateLibraryAccessionNumber', () => {
  it('gera um tombo no padrão institucional', () => {
    expect(generateLibraryAccessionNumber([], 2026, () => 42)).toBe('VL6-2026-00000042');
  });

  it('repete a geração quando encontra uma colisão', () => {
    const values = [42, 812_345];
    const result = generateLibraryAccessionNumber(['VL6-2026-00000042'], 2026, () =>
      values.shift()!,
    );

    expect(result).toBe('VL6-2026-00812345');
  });
});
