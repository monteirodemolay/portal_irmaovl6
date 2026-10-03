/** Shamir's Secret Sharing over GF(256), byte by byte.
 * Splits a secret into N shares so that any threshold of them reconstructs it exactly,
 * while any smaller group carries no information about the secret at all.
 * Used to split the Cripta's private key among its Guardiões — no share alone is useful. */
import { gfAdd, gfDiv, gfMul } from './gf256';

export type Share = { x: number; y: Uint8Array };

function randomByte(): number {
  return crypto.getRandomValues(new Uint8Array(1))[0]!;
}

/** Evaluate the polynomial with the given coefficients (constant term first) at point x, in GF(256). */
function evalPolynomial(coefficients: number[], x: number): number {
  let result = 0;
  let power = 1;
  for (const coefficient of coefficients) {
    result = gfAdd(result, gfMul(coefficient, power));
    power = gfMul(power, x);
  }
  return result;
}

export function splitSecret(secret: Uint8Array, totalShares: number, threshold: number): Share[] {
  if (!Number.isInteger(totalShares) || !Number.isInteger(threshold) || threshold < 2 ||
      threshold > totalShares || totalShares < 2 || totalShares > 254) {
    throw new Error('Parâmetros de fragmentação inválidos.');
  }
  if (secret.length === 0 || secret.length > 4096) throw new Error('Segredo de tamanho inválido.');
  const shares: Share[] = Array.from({ length: totalShares }, (_, index) => ({
    x: index + 1, y: new Uint8Array(secret.length),
  }));
  for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
    const coefficients = [secret[byteIndex]!];
    for (let degree = 1; degree < threshold; degree++) coefficients.push(randomByte());
    for (const share of shares) share.y[byteIndex] = evalPolynomial(coefficients, share.x);
  }
  return shares;
}

export function combineShares(shares: Share[]): Uint8Array {
  if (shares.length < 2) throw new Error('São necessárias ao menos duas partes.');
  const length = shares[0]!.y.length;
  if (shares.some((share) => share.y.length !== length)) throw new Error('Partes de tamanhos incompatíveis.');
  const xs = shares.map((share) => share.x);
  if (new Set(xs).size !== xs.length) throw new Error('Há partes repetidas (mesmo identificador).');
  if (xs.some((x) => x < 1 || x > 254)) throw new Error('Identificador de parte inválido.');
  const secret = new Uint8Array(length);
  for (let byteIndex = 0; byteIndex < length; byteIndex++) {
    // Lagrange interpolation at x=0: secret_byte = sum_i y_i * product_{j != i} (0 - x_j) / (x_i - x_j).
    let value = 0;
    for (let i = 0; i < shares.length; i++) {
      let numerator = 1;
      let denominator = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        numerator = gfMul(numerator, shares[j]!.x);
        denominator = gfMul(denominator, gfAdd(shares[i]!.x, shares[j]!.x));
      }
      value = gfAdd(value, gfMul(shares[i]!.y[byteIndex]!, gfDiv(numerator, denominator)));
    }
    secret[byteIndex] = value;
  }
  return secret;
}
