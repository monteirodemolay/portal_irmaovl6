import { describe, expect, it } from 'vitest';
import { formatDemolayCargoLabel } from './format-demolay-cargo-label';

describe('formatDemolayCargoLabel', () => {
  it('retorna só o status quando não há cargo dentro do Capítulo', () => {
    expect(formatDemolayCargoLabel({ status: 'Irregular', cargoOriginal: null })).toBe('Irregular');
  });

  it('combina status e cargo quando os dois são diferentes', () => {
    expect(formatDemolayCargoLabel({ status: 'Consultor', cargoOriginal: 'Ex-Membro' })).toBe(
      'Consultor — Ex-Membro',
    );
  });

  it('não repete a mesma palavra quando cargo e status coincidem', () => {
    expect(formatDemolayCargoLabel({ status: 'Consultor', cargoOriginal: 'Consultor' })).toBe(
      'Consultor',
    );
  });
});
