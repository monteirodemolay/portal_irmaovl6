import { describe, expect, it } from 'vitest';
import type { ExplorerEdge } from '../dtos/constellation-explorer.dto';
import { mergeConstellationEdges } from './merge-constellation-edges';

function edge(overrides: Partial<ExplorerEdge> = {}): ExplorerEdge {
  return {
    id: 'e1',
    sourceKey: 'archiveItem:1',
    targetKey: 'event:1',
    relationType: 'ocorreu_durante',
    relationLabel: 'Ocorreu durante',
    source: 'derived',
    ...overrides,
  };
}

describe('mergeConstellationEdges', () => {
  it('mantém as duas quando não há equivalência', () => {
    const derived = [edge({ id: 'd1' })];
    const curated = [edge({ id: 'c1', targetKey: 'member:1', relationType: 'retrata' })];
    expect(mergeConstellationEdges(derived, curated)).toHaveLength(2);
  });

  it('curated substitui derived equivalente (mesma origem/destino/tipo)', () => {
    const derived = [edge({ id: 'd1', relationLabel: 'Rótulo automático' })];
    const curated = [
      edge({ id: 'c1', source: 'curated', relationLabel: 'Rótulo editorial confirmado' }),
    ];

    const result = mergeConstellationEdges(derived, curated);

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('curated');
    expect(result[0]?.relationLabel).toBe('Rótulo editorial confirmado');
  });

  it('normaliza a ordem das pontas para tipos simétricos antes de deduplicar', () => {
    const derived = [
      edge({ id: 'd1', sourceKey: 'member:1', targetKey: 'member:2', relationType: 'relacionado_a' }),
    ];
    const curated = [
      edge({ id: 'c1', sourceKey: 'member:2', targetKey: 'member:1', relationType: 'relacionado_a' }),
    ];

    expect(mergeConstellationEdges(derived, curated)).toHaveLength(1);
  });
});
