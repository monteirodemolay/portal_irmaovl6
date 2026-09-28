/** GF(2^8) arithmetic over the AES/Rijndael field (x^8+x^4+x^3+x+1, 0x11B).
 * Pure math, no secrets. Shared by shamir.ts for Shamir's Secret Sharing. */

const EXP = new Uint8Array(510);
const LOG = new Uint8Array(256);

(function buildTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    // Multiply x by the generator (3) in GF(2^8): xtime(x) XOR x, reduced by 0x11B.
    const doubled = x << 1;
    const xtime = (doubled ^ (doubled & 0x100 ? 0x11b : 0)) & 0xff;
    x = xtime ^ x;
  }
  for (let i = 255; i < 510; i++) EXP[i] = EXP[i - 255]!;
})();

export function gfAdd(a: number, b: number): number {
  return a ^ b;
}

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Divisão por zero em GF(256).');
  if (a === 0) return 0;
  return EXP[(LOG[a]! - LOG[b]! + 255) % 255]!;
}
