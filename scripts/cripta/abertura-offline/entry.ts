/** Entry point bundled (by build.mjs, via esbuild) into index.html's inline <script>.
 * Reuses the exact same crypto modules the Portal itself uses for sealing letters and
 * splitting the Cripta's private key — nothing here is a reimplementation, so there is no
 * risk of the offline tool computing a different result than the browser that ran the
 * inauguration or the ensaio de conferência física. */
import { combineShares, type Share } from '../../../apps/web/src/modules/cripta/lib/shamir';
import {
  openWithCriptaPrivateKey,
  type CriptaPublicKey,
} from '../../../apps/web/src/modules/cripta/lib/cripta-key';
import {
  parseLacreFile,
  type LacreEntry,
  type ParsedLacreFile,
} from '../../../apps/web/src/modules/cripta/lib/lacre-format';
import {
  makeOfflinePackage,
  type LetterForExport,
} from '../../../apps/web/src/modules/cripta/lib/offline-package';

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

declare global {
  interface Window {
    CriptaOffline: {
      combineGuardianShares: typeof combineGuardianShares;
      parseLacre: typeof parseLacre;
      openLetterEntry: typeof openLetterEntry;
      makeOfflinePackage: typeof makeOfflinePackage;
    };
  }
}

window.CriptaOffline = { combineGuardianShares, parseLacre, openLetterEntry, makeOfflinePackage };
