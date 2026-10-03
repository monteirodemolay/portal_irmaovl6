import { describe, expect, it } from 'vitest';
import { gfAdd, gfDiv, gfMul } from './gf256';

describe('GF(256) field arithmetic', () => {
  it('multiplication is commutative and has identity/zero elements for every value', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMul(a, 0)).toBe(0);
      expect(gfMul(a, 1)).toBe(a);
      for (let b = 0; b < 256; b += 17) {
        expect(gfMul(a, b)).toBe(gfMul(b, a));
      }
    }
  });

  it('division undoes multiplication for every nonzero pair', () => {
    for (let a = 1; a < 256; a++) {
      for (let b = 1; b < 256; b++) {
        expect(gfDiv(gfMul(a, b), b)).toBe(a);
      }
    }
  });

  it('every nonzero element has a unique multiplicative inverse', () => {
    const seen = new Set<number>();
    for (let a = 1; a < 256; a++) {
      const inverse = gfDiv(1, a);
      expect(gfMul(a, inverse)).toBe(1);
      expect(seen.has(inverse)).toBe(false);
      seen.add(inverse);
    }
  });

  it('addition is XOR: self-inverse and identity at zero', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfAdd(a, 0)).toBe(a);
      expect(gfAdd(a, a)).toBe(0);
    }
  });

  it('rejects division by zero', () => {
    expect(() => gfDiv(5, 0)).toThrow();
  });
});
