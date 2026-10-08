import { guardianShareDigest } from '../../../apps/web/src/modules/cripta/lib/guardian-file-check';
/** Entry point bundled (by build.mjs, via esbuild) into index.html's inline <script>.
 * Reuses the exact same crypto modules the Portal itself uses for sealing letters and
 * splitting the Cripta's private key — nothing here is a reimplementation, so there is no
 * risk of the offline tool computing a different result than the browser that ran the
 * inauguration or the ensaio de conferência física. */
import {
  combineShares,
  splitSecret,
  type Share,
} from '../../../apps/web/src/modules/cripta/lib/shamir';
import {
  generateCriptaKeypair,
  openWithCriptaPrivateKey,
  sealForCripta,
  type CriptaPublicKey,
} from '../../../apps/web/src/modules/cripta/lib/cripta-key';
import {
  buildLacreFile,
  encodeEntries,
  parseLacreFile,
  type LacreEntry,
  type ParsedLacreFile,
} from '../../../apps/web/src/modules/cripta/lib/lacre-format';
import {
  makeOfflinePackage,
  type LetterForExport,
} from '../../../apps/web/src/modules/cripta/lib/offline-package';
import { digestLacreEntries } from '../../../apps/web/src/modules/cripta/lib/lacre-entry-digest';

export type GuardianShareFile = {
  format: 'vl6-cripta-guardian-share-v1';
  guardiao: string;
  parte: number;
  totalPartes: number;
  limiar: number;
  valor: string;
  chavePublicaCripta: CriptaPublicKey;
  ata: string;
  inauguradoEm: string;
};

function isGuardianShareFile(value: unknown): value is GuardianShareFile {
  if (!value || typeof value !== 'object') return false;
  const share = value as Record<string, unknown>;
  const key = share.chavePublicaCripta as Record<string, unknown> | undefined;
  return (
    share.format === 'vl6-cripta-guardian-share-v1' &&
    Number.isInteger(share.parte) &&
    Number.isInteger(share.totalPartes) &&
    Number.isInteger(share.limiar) &&
    typeof share.valor === 'string' &&
    typeof share.ata === 'string' &&
    !!key &&
    key.kty === 'EC' &&
    key.crv === 'P-256' &&
    typeof key.x === 'string' &&
    typeof key.y === 'string'
  );
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

/** Combines 3+ Guardião share files (downloaded at inauguration) back into the Cripta's
 * private key scalar. Verifies every file names the same ceremony (same public key, same
 * ata) before combining — mixing shares from two different inaugurations must fail loudly,
 * not produce a garbage key that silently fails to open anything. */
export function combineGuardianShares(files: unknown[]): {
  privateScalar: Uint8Array;
  publicKey: CriptaPublicKey;
  threshold: number;
} {
  if (files.length < 2) throw new Error('Selecione ao menos duas partes de Guardiões.');
  const shares: GuardianShareFile[] = files.map((file, index) => {
    if (!isGuardianShareFile(file))
      throw new Error(`O arquivo ${index + 1} não é uma parte de Guardião reconhecível.`);
    return file;
  });
  const first = shares[0]!;
  for (const share of shares) {
    if (
      share.ata !== first.ata ||
      JSON.stringify(share.chavePublicaCripta) !== JSON.stringify(first.chavePublicaCripta)
    ) {
      throw new Error('As partes selecionadas não são todas da mesma cerimônia de inauguração.');
    }
  }
  if (shares.length < first.limiar) {
    throw new Error(
      `São necessárias pelo menos ${first.limiar} partes; apenas ${shares.length} selecionada(s).`,
    );
  }
  const points: Share[] = shares.map((share) => ({ x: share.parte, y: fromBase64(share.valor) }));
  const privateScalar = combineShares(points);
  return { privateScalar, publicKey: first.chavePublicaCripta, threshold: first.limiar };
}

export async function parseLacre(bytes: Uint8Array): Promise<ParsedLacreFile> {
  return parseLacreFile(bytes);
}

export type EligibleMember = { id: string; nome: string };

/** The list is carried in by hand (downloaded online, before going offline) purely to cut down
 * typing errors when naming the new Guardiões in step 4 — it never travels the other way and
 * carries nothing secret, just name/id, so a wrong or stale copy is a UX annoyance, never a
 * security concern. */
export function parseEligibleMembers(value: unknown): EligibleMember[] {
  if (!value || typeof value !== 'object')
    throw new Error('Arquivo de Irmãos elegíveis não reconhecido.');
  const parsed = value as Record<string, unknown>;
  if (parsed.format !== 'vl6-cripta-eligible-members-v1' || !Array.isArray(parsed.members)) {
    throw new Error('Arquivo de Irmãos elegíveis não reconhecido.');
  }
  return parsed.members.map((entry) => {
    const member = entry as Record<string, unknown>;
    if (typeof member.id !== 'string' || typeof member.nome !== 'string') {
      throw new Error('Registro de Irmão elegível inválido no arquivo.');
    }
    return { id: member.id, nome: member.nome };
  });
}

/** Opens exactly one letter entry. Throws if the reconstructed key cannot open it (wrong
 * ceremony, tampered envelope) or if the entry is a draft (drafts use a different, server-held
 * key and cannot be opened offline — see cripta-especificacao-funcional.md). */
export async function openLetterEntry(
  entry: LacreEntry,
  privateScalar: Uint8Array,
  publicKey: CriptaPublicKey,
): Promise<LetterForExport> {
  if (entry.kind !== 'letter') {
    throw new Error(
      'Este registro é um rascunho, não uma carta selada. Rascunhos dependem do Portal e não abrem por esta ferramenta.',
    );
  }
  const envelope = JSON.parse(new TextDecoder().decode(entry.bytes)) as Parameters<
    typeof openWithCriptaPrivateKey
  >[0];
  const plaintext = await openWithCriptaPrivateKey(envelope, privateScalar, publicKey);
  const letter = JSON.parse(new TextDecoder().decode(plaintext)) as LetterForExport;
  if (letter.format !== 'vl6-online-letter-v1')
    throw new Error('Formato de carta não reconhecido.');
  return letter;
}

export { makeOfflinePackage };

/** The response to a Guardião falecido/impedido or um pen drive extraviado/retido: Shamir has
 * no revocation, so the only sound fix is a brand new key. This re-seals every sealed letter
 * under it — never just swapping one share — so the old key, and whatever old share remains out
 * there, stops protecting anything at all. Drafts pass through untouched: they use a per-account
 * key, never the Cripta's, so a key renewal has nothing to do with them. */
export type RenewalOutcome = {
  entries: LacreEntry[];
  failed: Array<{ id: string; error: string }>;
};

export async function reencryptAllLetters(
  entries: LacreEntry[],
  privateScalar: Uint8Array,
  publicKey: CriptaPublicKey,
  newPublicKey: CriptaPublicKey,
): Promise<RenewalOutcome> {
  const renewed: LacreEntry[] = [];
  const failed: RenewalOutcome['failed'] = [];
  for (const entry of entries) {
    if (entry.kind !== 'letter') {
      renewed.push(entry);
      continue;
    }
    try {
      const envelope = JSON.parse(new TextDecoder().decode(entry.bytes)) as Parameters<
        typeof openWithCriptaPrivateKey
      >[0];
      const plaintext = await openWithCriptaPrivateKey(envelope, privateScalar, publicKey);
      const resealed = await sealForCripta(plaintext, newPublicKey);
      const bytes = new TextEncoder().encode(JSON.stringify(resealed));
      const sha256 = Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('');
      renewed.push({ kind: 'letter', id: entry.id, uid: entry.uid, sha256, bytes });
    } catch (error) {
      failed.push({ id: entry.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { entries: renewed, failed };
}

/** Generated fresh, in this same air-gapped session, exactly like at Inauguração — never
 * derived from the old key in any way. */
export async function generateRenewedKey(
  totalGuardians: number,
  threshold: number,
): Promise<{ publicKey: CriptaPublicKey; shares: Share[]; guardianShareDigests: string[] }> {
  const { publicKey, privateScalar } = await generateCriptaKeypair();
  const shares = splitSecret(privateScalar, totalGuardians, threshold);
  privateScalar.fill(0); // never kept once split, same discipline as the Inauguration panel
  const guardianShareDigests = await Promise.all(
    shares.map((share) => guardianShareDigest(share, publicKey, totalGuardians, threshold)),
  );
  return { publicKey, shares, guardianShareDigests };
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  )
    .join('')
    .toUpperCase();
}

export type RenewedLacre = {
  bytes: Uint8Array;
  code: string;
  inventoryDigest: string;
  letters: number;
  drafts: number;
};

/** Same CRIPTA/2 format as any other lacre, so every downstream step (Conferência física,
 * Restauração) that already knows how to read a .lacre keeps working unchanged — a Renovação
 * is not a new file format, just a new reason one got produced. */
export async function buildRenewedLacre(entries: LacreEntry[]): Promise<RenewedLacre> {
  const inventoryDigest = await digestLacreEntries(entries);
  const letters = entries.filter((entry) => entry.kind === 'letter').length;
  const drafts = entries.filter((entry) => entry.kind === 'draft').length;
  const yyyymmdd = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const code = `VL6-${yyyymmdd}-${randomHex(6)}`;
  const bytes = buildLacreFile(
    { formato: 'CRIPTA/2', codigoLacracao: code, inventoryDigest, totalCartas: letters },
    encodeEntries(entries),
  );
  return { bytes, code, inventoryDigest, letters, drafts };
}

declare global {
  interface Window {
    CriptaOffline: {
      combineGuardianShares: typeof combineGuardianShares;
      parseLacre: typeof parseLacre;
      openLetterEntry: typeof openLetterEntry;
      makeOfflinePackage: typeof makeOfflinePackage;
      reencryptAllLetters: typeof reencryptAllLetters;
      generateRenewedKey: typeof generateRenewedKey;
      buildRenewedLacre: typeof buildRenewedLacre;
      parseEligibleMembers: typeof parseEligibleMembers;
    };
  }
}

// Guarded so this file stays importable from a plain Node test (vitest, no `window`) to unit-test
// these functions directly — the browser bundle always has `window`, so this never changes what
// ships to the offline tool itself.
if (typeof window !== 'undefined') {
  window.CriptaOffline = {
    combineGuardianShares,
    parseLacre,
    openLetterEntry,
    makeOfflinePackage,
    reencryptAllLetters,
    generateRenewedKey,
    buildRenewedLacre,
    parseEligibleMembers,
  };
}
