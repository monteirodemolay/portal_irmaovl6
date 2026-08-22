import { describe, expect, it } from 'vitest';
import { formatArchiveSummaryLabel } from './format-archive-summary-label';
import type { EventArchiveSummary } from './load-event-album';

function buildSummary(overrides: Partial<EventArchiveSummary> = {}): EventArchiveSummary {
  return { totalCount: 0, fotos: 0, videos: 0, audios: 0, documentos: 0, ...overrides };
}

describe('formatArchiveSummaryLabel', () => {
  it('combina múltiplas categorias com separador', () => {
    const label = formatArchiveSummaryLabel(
      buildSummary({ totalCount: 47, fotos: 45, videos: 2 }),
    );
    expect(label).toBe('45 fotos · 2 vídeos');
  });

  it('usa singular quando a contagem é 1', () => {
    const label = formatArchiveSummaryLabel(buildSummary({ totalCount: 1, videos: 1 }));
    expect(label).toBe('1 vídeo');
  });

  it('omite categorias sem nenhum item', () => {
    const label = formatArchiveSummaryLabel(buildSummary({ totalCount: 3, documentos: 3 }));
    expect(label).toBe('3 documentos');
  });

  it('retorna string vazia quando não há nenhuma categoria', () => {
    expect(formatArchiveSummaryLabel(buildSummary())).toBe('');
  });
});
