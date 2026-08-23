import { describe, expect, it } from 'vitest';
import {
  matchesArchiveSearch,
  normalizeSearchText,
  type ArchiveSearchResult,
} from './archive-search-match';

function makeResult(overrides: Partial<ArchiveSearchResult> = {}): ArchiveSearchResult {
  return {
    id: 'file-1',
    kind: 'documento',
    title: 'Circular 001/2026',
    description: 'Convocação oficial.',
    href: '/acervo/item/file_1',
    compositeId: 'file_1',
    createdAt: new Date(),
    catalogText: null,
    ...overrides,
  };
}

describe('normalizeSearchText', () => {
  it('remove acentos e caixa', () => {
    expect(normalizeSearchText('Sessão Magna')).toBe('sessao magna');
  });
});

describe('matchesArchiveSearch', () => {
  it('casa por título mesmo com acento/caixa diferentes', () => {
    const result = makeResult({ title: 'Sessão Magna de Fevereiro' });
    expect(matchesArchiveSearch(result, 'sessao magna')).toBe(true);
  });

  it('casa por texto da ficha de catalogação publicada (Estágio 6)', () => {
    const result = makeResult({
      title: 'Circular 001/2026',
      description: 'Convocação oficial.',
      catalogText: 'A Convocação que Reuniu a Loja em 2026 sessão magna',
    });
    expect(matchesArchiveSearch(result, 'reuniu a loja')).toBe(true);
  });

  it('não casa termo que só existe em ficha não publicada (catalogText null)', () => {
    const result = makeResult({ catalogText: null });
    expect(matchesArchiveSearch(result, 'termo inexistente no titulo')).toBe(false);
  });

  it('string vazia casa com tudo', () => {
    expect(matchesArchiveSearch(makeResult(), '')).toBe(true);
  });

  it('casa evento do Acervo novo pela legenda das mídias publicadas', () => {
    const result = makeResult({
      kind: 'evento',
      title: 'Sessão Pública do Dia dos Pais',
      description: 'Rio Verde – GO',
      catalogText: 'Mesa de honra com o Venerável Mestre',
    });
    expect(matchesArchiveSearch(result, 'mesa de honra')).toBe(true);
  });
});
