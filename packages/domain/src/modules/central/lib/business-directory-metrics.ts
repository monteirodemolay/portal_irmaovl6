import type { BusinessDirectoryEntryDTO } from '../dtos/business-directory-entry.dto';

export interface BusinessDirectoryFilterOption {
  value: string;
  count: number;
}

export interface BusinessDirectoryFilterOptions {
  segmentos: BusinessDirectoryFilterOption[];
  cidades: BusinessDirectoryFilterOption[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function countDistinct(values: Iterable<string>): BusinessDirectoryFilterOption[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { value: trimmed, count: 1 });
  }
  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, 'pt-BR'),
  );
}

/**
 * "Só o que realmente existe publicado" — mesmo princípio de
 * `computeDirectoryFilterOptions` (Diretório de Irmãos), aplicado ao
 * Diretório de Negócios & Serviços: segmento e cidade viram seletores só
 * com valores que algum negócio publicado de fato usa, nunca texto livre.
 * Sempre computado sobre o conjunto COMPLETO de negócios publicados, antes
 * de qualquer filtro já aplicado — as opções disponíveis não encolhem
 * conforme o usuário filtra.
 */
export function computeBusinessDirectoryFilterOptions(
  entries: BusinessDirectoryEntryDTO[],
): BusinessDirectoryFilterOptions {
  function* segmentos() {
    for (const entry of entries) if (entry.segmento) yield entry.segmento;
  }
  function* cidades() {
    for (const entry of entries) if (entry.cidade) yield entry.cidade;
  }

  return {
    segmentos: countDistinct(segmentos()),
    cidades: countDistinct(cidades()),
  };
}
