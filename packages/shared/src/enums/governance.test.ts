import { describe, expect, it } from 'vitest';
import {
  BOARD_POSITION_HIERARCHY_ORDER,
  getBoardPositionHierarchyRank,
  getBoardPositionOrdinalLabel,
} from './governance';

describe('getBoardPositionHierarchyRank', () => {
  it('ordena Venerável Mestre antes de Vigilantes, e Vigilantes antes de Diácono', () => {
    expect(getBoardPositionHierarchyRank('veneravel_mestre')).toBeLessThan(
      getBoardPositionHierarchyRank('primeiro_vigilante'),
    );
    expect(getBoardPositionHierarchyRank('primeiro_vigilante')).toBeLessThan(
      getBoardPositionHierarchyRank('segundo_vigilante'),
    );
    expect(getBoardPositionHierarchyRank('segundo_vigilante')).toBeLessThan(
      getBoardPositionHierarchyRank('diacono'),
    );
  });

  it('joga cargo extra (fora de BOARD_POSITION_KEYS) pro fim', () => {
    expect(getBoardPositionHierarchyRank('cargo-inventado')).toBe(
      BOARD_POSITION_HIERARCHY_ORDER.length,
    );
  });
});

describe('getBoardPositionOrdinalLabel', () => {
  it('acrescenta ordinal a Diácono e Experto', () => {
    expect(getBoardPositionOrdinalLabel('diacono', 1)).toBe('1º Diácono');
    expect(getBoardPositionOrdinalLabel('diacono', 2)).toBe('2º Diácono');
    expect(getBoardPositionOrdinalLabel('experto', 1)).toBe('1º Experto');
  });

  it('não acrescenta ordinal a cargos de ocorrência única', () => {
    expect(getBoardPositionOrdinalLabel('secretario', 1)).toBe('Secretário');
  });
});
