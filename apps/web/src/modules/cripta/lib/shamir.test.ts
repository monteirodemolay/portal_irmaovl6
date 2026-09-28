import { describe, expect, it } from 'vitest';
import { combineShares, splitSecret, type Share } from './shamir';

function combos<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  const withFirst = combos(rest, size - 1).map((combo) => [first!, ...combo]);
  const withoutFirst = combos(rest, size);
  return [...withFirst, ...withoutFirst];
}

describe('Shamir secret sharing (Cripta guardian key split)', () => {
  it('reconstructs a 32-byte key (the real P-256 scalar size) from any 3-of-5 combination', () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const shares = splitSecret(secret, 5, 3);
    expect(shares).toHaveLength(5);
    for (const combo of combos(shares, 3)) {
      expect(combineShares(combo)).toEqual(secret);
    }
  });

  it('reconstructs correctly using all shares and using exactly the threshold, for several secret sizes', () => {
    for (const size of [1, 16, 32, 64, 138]) {
      const secret = crypto.getRandomValues(new Uint8Array(size));
      const shares = splitSecret(secret, 5, 3);
      expect(combineShares(shares)).toEqual(secret);
      expect(combineShares(shares.slice(0, 3))).toEqual(secret);
      expect(combineShares(shares.slice(2, 5))).toEqual(secret);
    }
  });

  it('does not reconstruct the secret from fewer shares than the threshold', () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const shares = splitSecret(secret, 5, 3);
    // Below threshold, interpolation is underdetermined: across many independent splits
    // the wrong-guess result must essentially never equal the real secret.
    let matches = 0;
    for (let trial = 0; trial < 50; trial++) {
      const freshSecret = crypto.getRandomValues(new Uint8Array(32));
      const freshShares = splitSecret(freshSecret, 5, 3);
      const guess = combineShares(freshShares.slice(0, 2));
      if (guess.every((byte, index) => byte === freshSecret[index])) matches++;
    }
    expect(matches).toBe(0);
    void shares;
  });

  it('a single share alone reveals nothing usable (any x works as "second" share and yields a different result each time)', () => {
    const secret = crypto.getRandomValues(new Uint8Array(8));
    const shares = splitSecret(secret, 5, 3);
    const [one] = shares;
    const fakeCompanion: Share = { x: 250, y: crypto.getRandomValues(new Uint8Array(8)) };
    const guess1 = combineShares([one!, fakeCompanion]);
    fakeCompanion.y = crypto.getRandomValues(new Uint8Array(8));
    const guess2 = combineShares([one!, fakeCompanion]);
    expect(guess1).not.toEqual(guess2); // no stable answer emerges from one real share
  });

  it('rejects duplicate shares, mismatched sizes, and invalid split parameters', () => {
    const secret = new Uint8Array([1, 2, 3]);
    const shares = splitSecret(secret, 5, 3);
    expect(() => combineShares([shares[0]!, shares[0]!])).toThrow();
    expect(() => combineShares([shares[0]!, { x: 2, y: new Uint8Array([1, 2]) }])).toThrow();
    expect(() => combineShares([shares[0]!])).toThrow();
    expect(() => splitSecret(secret, 5, 1)).toThrow();
    expect(() => splitSecret(secret, 5, 6)).toThrow();
    expect(() => splitSecret(new Uint8Array(0), 5, 3)).toThrow();
  });

  it('produces independent randomness across splits (two splits of the same secret differ)', () => {
    const secret = new Uint8Array(32).fill(42);
    const a = splitSecret(secret, 5, 3);
    const b = splitSecret(secret, 5, 3);
    expect(a.map((s) => Array.from(s.y))).not.toEqual(b.map((s) => Array.from(s.y)));
    expect(combineShares(a.slice(0, 3))).toEqual(secret);
    expect(combineShares(b.slice(0, 3))).toEqual(secret);
  });
});
