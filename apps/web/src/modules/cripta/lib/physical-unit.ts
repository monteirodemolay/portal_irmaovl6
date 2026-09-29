/** Browser readback of a CRIPTA/2 file and its matching unit manifest. */
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const HASH_CHUNK = 64 * 1024 * 1024;

export type UnitEvidence = {
  format: 'CRIPTA/2';
  code: string;
  unitCode: string;
  fingerprint: string;
  size: number;
  totalLetters: number;
  inventoryDigest: string;
};

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}

const UNIT_LETTERS = 'ABCDEFGHI';

/** e.g. buildPenDriveCode('VL6-20260928-ABCDEF123456', 'A') -> 'PD-A-ABCDEF123456-01' */
export function buildPenDriveCode(codigoLacracao: string, unitLetter: string): string {
  const suffix = codigoLacracao.split('-').at(-1);
  const index = UNIT_LETTERS.indexOf(unitLetter);
  if (!suffix || index === -1) throw new Error('Letra de unidade inválida (use A a I) ou código de lacração inválido.');
  return `PD-${unitLetter}-${suffix}-0${index + 1}`;
}

/** This is CRIPTA-HASH, not the ordinary SHA-256 of the whole file. */
export async function fingerprintLacre(file: Blob): Promise<string> {
  if (!file.size) throw new Error('Arquivo da unidade vazio.');
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < file.size; offset += HASH_CHUNK) {
    const bytes = await file.slice(offset, offset + HASH_CHUNK).arrayBuffer();
    chunks.push(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  }
  const prefix = encoder.encode(`CRIPTA-HASH|${file.size}|`);
  const combined = new Uint8Array(prefix.length + chunks.length * 32);
  combined.set(prefix);
  chunks.forEach((chunk, index) => combined.set(chunk, prefix.length + index * 32));
  return hex(await crypto.subtle.digest('SHA-256', combined));
}

export async function inspectPhysicalUnit(file: Blob, manifestText: string): Promise<UnitEvidence> {
  let manifest: Record<string, unknown>;
  try { manifest = JSON.parse(manifestText) as Record<string, unknown>; }
  catch { throw new Error('Manifesto ilegível. Selecione o arquivo JSON desta unidade.'); }
  if (file.size < 44 || file.size > Number.MAX_SAFE_INTEGER) throw new Error('Arquivo .lacre inválido.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (decoder.decode(header.subarray(0, 8)) !== 'CRIPTA02') throw new Error('Formato de lacre desconhecido. Use CRIPTA/2.');
  const length = new DataView(header.buffer).getUint32(8);
  if (!length || length > 64 * 1024 || 12 + length + 32 > file.size) throw new Error('Cabeçalho do lacre inválido.');
  let details: Record<string, unknown>;
  try { details = JSON.parse(decoder.decode(await file.slice(12, 12 + length).arrayBuffer())) as Record<string, unknown>; }
  catch { throw new Error('Cabeçalho do lacre ilegível.'); }
  const trailer = new Uint8Array(await file.slice(file.size - 8).arrayBuffer());
  if (decoder.decode(trailer) !== 'CRIPTAFI') throw new Error('Arquivo .lacre incompleto.');
  if (!details || typeof details !== 'object') throw new Error('Cabeçalho do lacre inválido.');
  const code = details.codigoLacracao;
  const fingerprint = manifest.impressaoDigital;
  const suffix = typeof code === 'string' ? code.split('-').at(-1) : null;
  const unitCode = manifest.codigoPenDrive;
  const unitPattern = suffix ? new RegExp(`^PD-([A-I])-${suffix}-0([1-9])$`) : null;
  const unitMatch = typeof unitCode === 'string' ? unitPattern?.exec(unitCode) : null;
  if (details.formato !== 'CRIPTA/2' || manifest.formato !== 'CRIPTA/2' ||
      typeof code !== 'string' || !/^LAC-[A-Z0-9-]{5,48}$|^VL6-[A-Z0-9-]{8,48}$/.test(code) ||
      manifest.codigoLacracao !== code || !unitMatch ||
      unitMatch[1]!.charCodeAt(0) - 64 !== Number(unitMatch[2]) ||
      typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint) ||
      typeof details.inventoryDigest !== 'string' || !/^[a-f0-9]{64}$/.test(details.inventoryDigest) ||
      manifest.inventoryDigest !== details.inventoryDigest ||
      manifest.tamanho !== file.size || manifest.totalCartas !== details.totalCartas ||
      !Number.isSafeInteger(details.totalCartas) || (details.totalCartas as number) < 0) {
    throw new Error('Manifesto e arquivo .lacre não correspondem.');
  }
  const actual = await fingerprintLacre(file);
  if (actual !== fingerprint) throw new Error('A cópia está corrompida ou não corresponde ao manifesto.');
  return { format: 'CRIPTA/2', code, unitCode: unitCode as string,
    fingerprint: actual, size: file.size, totalLetters: details.totalCartas as number,
    inventoryDigest: details.inventoryDigest };
}

export function comparePhysicalUnits(first: UnitEvidence, second: UnitEvidence, receiptCode: string,
  expectedLetters: number, expectedInventoryDigest: string) {
  if (first.unitCode === second.unitCode) throw new Error('Selecione manifestos de duas unidades distintas.');
  if (first.code !== receiptCode || second.code !== receiptCode || first.fingerprint !== second.fingerprint ||
      first.size !== second.size || first.totalLetters !== second.totalLetters ||
      first.totalLetters !== expectedLetters || first.inventoryDigest !== expectedInventoryDigest ||
      second.inventoryDigest !== expectedInventoryDigest) {
    throw new Error('As cópias divergem entre si ou do recibo do inventário. Suspenda a lacração.');
  }
  return { code: receiptCode, fingerprint: first.fingerprint, size: first.size,
    totalLetters: first.totalLetters, inventoryDigest: expectedInventoryDigest, units: [first.unitCode, second.unitCode] };
}
