import type { CriptaPublicKey } from './cripta-key';
import type { Share } from './shamir';

export const MAX_GUARDIAN_FILE_BYTES = 16_384;
export type GuardianCheckReference = {
  publicKey: CriptaPublicKey;
  totalGuardians: number;
  threshold: number;
  guardianShareDigests?: string[];
  guardians: { name: string; status: 'valida' | 'comprometida' }[];
};

export function validGuardianDigests(value: unknown, total: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === total &&
    value.every((item) => typeof item === 'string' && /^[a-f0-9]{64}$/.test(item))
  );
}

/** Canonical commitment to the actual share, its index, quorum and public key.
 * Display names, whitespace and JSON property ordering do not change the key. */
export async function guardianShareDigest(
  share: Share,
  key: CriptaPublicKey,
  total: number,
  threshold: number,
) {
  const canonical = JSON.stringify([
    'vl6-guardian-integrity-v1',
    key.kty,
    key.crv,
    key.x,
    key.y,
    total,
    threshold,
    share.x,
    btoa(String.fromCharCode(...share.y)),
  ]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function checkGuardianFile(text: string, reference: GuardianCheckReference) {
  if (new TextEncoder().encode(text).length > MAX_GUARDIAN_FILE_BYTES)
    throw new Error(
      'Arquivo acima do tamanho esperado. Selecione apenas o JSON da parte do Guardião.',
    );
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON legível.');
  }
  if (
    !file ||
    file.format !== 'vl6-cripta-guardian-share-v1' ||
    !Number.isInteger(file.parte) ||
    file.parte < 1 ||
    file.parte > reference.totalGuardians ||
    file.totalPartes !== reference.totalGuardians ||
    file.limiar !== reference.threshold ||
    typeof file.valor !== 'string' ||
    !/^[A-Za-z0-9+/]{43}=$/.test(file.valor)
  )
    throw new Error('Formato, número da parte ou tamanho do fragmento inválido.');
  const bytes = Uint8Array.from(atob(file.valor), (char) => char.charCodeAt(0));
  if (bytes.length !== 32 || btoa(String.fromCharCode(...bytes)) !== file.valor)
    throw new Error('Fragmento inválido.');
  const key = file.chavePublicaCripta;
  if (
    !key ||
    key.kty !== 'EC' ||
    key.crv !== 'P-256' ||
    key.x !== reference.publicKey.x ||
    key.y !== reference.publicKey.y
  )
    throw new Error(
      'Esta parte pertence a outra chave. Pode ser de uma Cripta ou renovação anterior.',
    );
  const guardian = reference.guardians[file.parte - 1];
  if (!guardian) throw new Error('Parte sem Guardião correspondente no registro atual.');
  try {
    const digest = await guardianShareDigest(
      { x: file.parte, y: bytes },
      reference.publicKey,
      reference.totalGuardians,
      reference.threshold,
    );
    const expected = reference.guardianShareDigests?.[file.parte - 1];
    if (expected && digest !== expected)
      throw new Error(
        'A parte difere da impressão digital registrada. Não considere este arquivo íntegro.',
      );
    return {
      part: file.parte as number,
      guardian: guardian.name,
      compromised: guardian.status === 'comprometida',
      integrity: expected ? ('confirmed' as const) : ('unconfirmed' as const),
    };
  } finally {
    bytes.fill(0);
  }
}
