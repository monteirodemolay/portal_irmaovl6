/** The CRIPTA/2 physical-media file format: one binary file containing every sealed letter
 * and draft, ready to be copied verbatim onto each external unit (pen drive/SSD). Reading and
 * fingerprint verification already exist in physical-unit.ts; this module only builds the file.
 * Uses node Buffer, so only import it from server code (API routes), never a client component. */

export type LacreHeader = { formato: 'CRIPTA/2'; codigoLacracao: string; inventoryDigest: string; totalCartas: number };
export type LacreEntry = { kind: 'letter' | 'draft'; id: string; uid: string; sha256: string; bytes: Uint8Array };

const MAGIC = new TextEncoder().encode('CRIPTA02');
const TRAILER = new TextEncoder().encode('CRIPTAFI');
const CODE_PATTERN = /^LAC-[A-Z0-9-]{5,48}$|^VL6-[A-Z0-9-]{8,48}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return Buffer.from(binary, 'binary').toString('base64');
}

/** One JSON object per line: {kind, id, uid, sha256, bytes(base64)}. Order does not affect any
 * digest (those are computed over metadata alone in seal-manifest.ts) but is kept stable here
 * for reproducibility. */
export function encodeEntries(entries: LacreEntry[]): Uint8Array {
  const lines = [...entries]
    .sort((a, b) => {
      const left = `${a.kind}:${a.uid}:${a.id}`;
      const right = `${b.kind}:${b.uid}:${b.id}`;
      return left < right ? -1 : left > right ? 1 : 0;
    })
    .map((entry) => JSON.stringify({ kind: entry.kind, id: entry.id, uid: entry.uid, sha256: entry.sha256, bytes: toBase64(entry.bytes) }) + '\n');
  return new TextEncoder().encode(lines.join(''));
}

export function buildLacreFile(header: LacreHeader, payload: Uint8Array): Uint8Array {
  if (header.formato !== 'CRIPTA/2') throw new Error('Formato de cabeçalho inválido.');
  if (!CODE_PATTERN.test(header.codigoLacracao)) throw new Error('Código de lacração inválido.');
  if (!DIGEST_PATTERN.test(header.inventoryDigest)) throw new Error('Digesto de inventário inválido.');
  if (!Number.isInteger(header.totalCartas) || header.totalCartas < 0) throw new Error('Total de cartas inválido.');
  const headerJson = new TextEncoder().encode(JSON.stringify(header));
  if (headerJson.length > 64 * 1024) throw new Error('Cabeçalho do lacre grande demais.');
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, headerJson.length);
  const out = new Uint8Array(MAGIC.length + lengthBytes.length + headerJson.length + payload.length + TRAILER.length);
  let offset = 0;
  out.set(MAGIC, offset); offset += MAGIC.length;
  out.set(lengthBytes, offset); offset += lengthBytes.length;
  out.set(headerJson, offset); offset += headerJson.length;
  out.set(payload, offset); offset += payload.length;
  out.set(TRAILER, offset);
  return out;
}
