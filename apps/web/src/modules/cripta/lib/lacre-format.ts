/** The CRIPTA/2 physical-media file format: one binary file containing every sealed letter
 * and draft, ready to be copied verbatim onto each external unit (pen drive/SSD). The write
 * side (buildLacreFile/encodeEntries) runs on the server, in the export route. The read side
 * (parseLacreFile) is isomorphic — it also runs inside the offline opening tool in a plain
 * browser (see scripts/cripta/abertura-offline), so this module never touches node's Buffer. */

export type LacreHeader = { formato: 'CRIPTA/2'; codigoLacracao: string; inventoryDigest: string; totalCartas: number };
export type LacreEntry = { kind: 'letter' | 'draft'; id: string; uid: string; sha256: string; bytes: Uint8Array };

const MAGIC = new TextEncoder().encode('CRIPTA02');
const TRAILER = new TextEncoder().encode('CRIPTAFI');
const CODE_PATTERN = /^LAC-[A-Z0-9-]{5,48}$|^VL6-[A-Z0-9-]{8,48}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Conteúdo cifrado inválido no lacre.');
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
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

export type ParsedLacreFile = { header: LacreHeader; entries: LacreEntry[] };

/** The inverse of buildLacreFile + encodeEntries. Verifies every entry's sha256 against the
 * bytes actually stored — a corrupted or truncated file fails here, not silently later. */
export async function parseLacreFile(file: Uint8Array): Promise<ParsedLacreFile> {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  if (file.length < MAGIC.length + 4 + TRAILER.length) throw new Error('Arquivo .lacre vazio ou incompleto.');
  if (decoder.decode(file.slice(0, MAGIC.length)) !== 'CRIPTA02') throw new Error('Formato desconhecido. Selecione um arquivo CRIPTA/2.');
  const length = new DataView(file.buffer, file.byteOffset + MAGIC.length, 4).getUint32(0);
  const headerStart = MAGIC.length + 4;
  if (!length || length > 64 * 1024 || headerStart + length + TRAILER.length > file.length) {
    throw new Error('Cabeçalho do lacre inválido.');
  }
  const header = JSON.parse(decoder.decode(file.slice(headerStart, headerStart + length))) as LacreHeader;
  if (header.formato !== 'CRIPTA/2' || !CODE_PATTERN.test(header.codigoLacracao) ||
      !DIGEST_PATTERN.test(header.inventoryDigest) || !Number.isInteger(header.totalCartas)) {
    throw new Error('Cabeçalho do lacre não reconhecido.');
  }
  if (decoder.decode(file.slice(file.length - TRAILER.length)) !== 'CRIPTAFI') {
    throw new Error('Arquivo .lacre incompleto ou corrompido (rodapé ausente).');
  }
  const bodyStart = headerStart + length;
  const bodyEnd = file.length - TRAILER.length;
  const body = decoder.decode(file.slice(bodyStart, bodyEnd));
  const entries: LacreEntry[] = [];
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as { kind?: unknown; id?: unknown; uid?: unknown; sha256?: unknown; bytes?: unknown };
    if ((parsed.kind !== 'letter' && parsed.kind !== 'draft') || typeof parsed.id !== 'string' ||
        typeof parsed.uid !== 'string' || typeof parsed.sha256 !== 'string' || typeof parsed.bytes !== 'string') {
      throw new Error('Registro do lacre com formato inválido.');
    }
    const bytes = fromBase64(parsed.bytes);
    if (await sha256Hex(bytes) !== parsed.sha256) throw new Error(`Registro ${parsed.id} corrompido: hash não confere.`);
    entries.push({ kind: parsed.kind, id: parsed.id, uid: parsed.uid, sha256: parsed.sha256, bytes });
  }
  if (entries.filter((entry) => entry.kind === 'letter').length !== header.totalCartas) {
    throw new Error('O número de cartas no arquivo não confere com o cabeçalho.');
  }
  return { header, entries };
}
