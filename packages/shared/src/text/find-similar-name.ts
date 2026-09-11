import { normalizeNameForSearch } from './format-person-name';

/**
 * Distância de edição (Levenshtein) entre duas strings — número mínimo de
 * inserções/remoções/substituições de um caractere pra transformar `a`
 * em `b`. Puro, sem dependência de nenhuma outra parte do sistema.
 */
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i]![0] = i;
  for (let j = 0; j < cols; j++) dp[0]![j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[rows - 1]![cols - 1]!;
}

/**
 * `true` quando duas strings JÁ normalizadas (`normalizeNameForSearch`) são
 * parecidas o bastante pra serem um erro de digitação da mesma pessoa em
 * vez de duas pessoas distintas — ex.: "ivan damasceno" × "ivam damasceno"
 * (uma letra) ou "mauricio borges de souza" × "mauricio borges de sousa"
 * (uma letra no sobrenome). Limiar deliberadamente conservador (distância
 * ≤ 2 e ≤ 20% do tamanho do nome) pra não acusar falso positivo em nomes
 * curtos genuinamente distintos. Espera as duas entradas já normalizadas —
 * quem compara nomes crus deve normalizar antes de chamar.
 */
export function areNormalizedNamesSimilar(a: string, b: string): boolean {
  if (a === b) return false; // exatamente iguais não é "parecido", é o mesmo
  const distance = levenshteinDistance(a, b);
  if (distance === 0) return false;
  const maxLength = Math.max(a.length, b.length);
  return distance <= 2 && distance / maxLength <= 0.2;
}

/**
 * Acha, entre `candidateNames`, o nome mais parecido com `name` — típico de
 * um erro de digitação (ex.: "Ivan Damasceno" × "Ivam Damasceno", uma letra
 * diferente) em vez de duas pessoas distintas. Nunca retorna o próprio
 * `name` (comparação exata é responsabilidade de quem chama, via
 * `normalizeNameForSearch`) nem nomes claramente diferentes — mesmo limiar
 * de `areNormalizedNamesSimilar`. Usado pra nunca criar um cadastro novo de
 * Irmão sem o Administrador confirmar que não é o mesmo Irmão já cadastrado
 * com o nome grafado ligeiramente diferente (`ImportHistoricalBoardTermsUseCase`).
 */
export function findSimilarName(name: string, candidateNames: string[]): string | null {
  const target = normalizeNameForSearch(name);
  let best: { candidate: string; distance: number } | null = null;

  for (const candidateName of candidateNames) {
    const candidate = normalizeNameForSearch(candidateName);
    if (!areNormalizedNamesSimilar(target, candidate)) continue;

    const distance = levenshteinDistance(target, candidate);
    if (!best || distance < best.distance) {
      best = { candidate: candidateName, distance };
    }
  }

  return best?.candidate ?? null;
}
