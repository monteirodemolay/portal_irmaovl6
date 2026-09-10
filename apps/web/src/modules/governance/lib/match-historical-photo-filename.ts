import { normalizeNameForSearch } from '@vl6/shared';

/**
 * Casa o nome de um arquivo de foto (ex.: "01. Ribas Marques 78.79.png",
 * "49Helton Chacarosque_25_26.png") com um dos nomes conhecidos da
 * nominata histórica — usado por `importHistoricalBoardTermsAction` pra
 * decidir de quem é cada foto enviada, sem depender de convenção rígida de
 * nomenclatura (a Secretaria numerou os arquivos à mão, formatos variam).
 *
 * Estratégia: tira extensão, números de ordem/ano e pontuação, normaliza
 * (minúsculo, sem acento — `normalizeNameForSearch`) e escolhe, entre os
 * nomes conhecidos, o de maior sobreposição de palavras com o texto do
 * arquivo. Exige pelo menos 2 palavras em comum (ou 1 se o nome conhecido
 * só tem uma palavra) pra evitar falso positivo — melhor deixar uma foto
 * sem casar (aparece como "não reconhecida" no relatório) do que grudar
 * na pessoa errada.
 */
export function matchHistoricalPhotoFilename(
  filename: string,
  knownNames: readonly string[],
): string | null {
  const withoutExtension = filename.replace(/\.[a-zA-Z0-9]+$/, '');
  // Separador entre o número de ordem e o nome nem sempre existe (ex.:
  // "49Helton Chacarosque...") — `*` em vez de `+` cobre os dois formatos.
  const withoutOrdinal = withoutExtension.replace(/^\s*\d{1,3}[.\-_\s]*/, '');
  const withoutYearSuffix = withoutOrdinal.replace(/[\s._-]*\d{2}[.\-_]\d{2}\s*$/, '');
  const normalizedFile = normalizeNameForSearch(withoutYearSuffix);
  const fileWords = new Set(normalizedFile.split(' ').filter(Boolean));
  if (fileWords.size === 0) return null;

  let best: { name: string; score: number } | null = null;
  for (const name of knownNames) {
    const normalizedName = normalizeNameForSearch(name);
    const nameWords = normalizedName.split(' ').filter(Boolean);
    if (nameWords.length === 0) continue;

    const overlap = nameWords.filter((word) => fileWords.has(word)).length;
    const minOverlap = nameWords.length === 1 ? 1 : 2;
    if (overlap < minOverlap) continue;

    const score = overlap / nameWords.length;
    if (!best || score > best.score) {
      best = { name, score };
    }
  }

  return best?.name ?? null;
}
