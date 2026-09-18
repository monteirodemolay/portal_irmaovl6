const MAX_RANDOM_VALUE = 100_000_000;
const MAX_ATTEMPTS = 20;

/**
 * Gera um tombo legível, imprimível e sem sequência manual.
 * O conjunto existente impede colisões dentro do tenant.
 */
export function generateLibraryAccessionNumber(
  existingNumbers: Iterable<string>,
  year: number,
  nextRandom: () => number,
): string {
  const existing = new Set(Array.from(existingNumbers, (value) => value.toUpperCase()));

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const randomPart = Math.trunc(nextRandom()).toString().padStart(8, '0');
    const accessionNumber = `VL6-${year}-${randomPart}`;
    if (!existing.has(accessionNumber)) return accessionNumber;
  }

  throw new Error('Não foi possível gerar um número de tombo único. Tente novamente.');
}

export const LIBRARY_ACCESSION_RANDOM_LIMIT = MAX_RANDOM_VALUE;
