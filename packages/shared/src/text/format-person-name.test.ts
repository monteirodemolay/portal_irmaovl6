import { describe, expect, it } from 'vitest';
import { formatBrazilianPersonName } from './format-person-name';

describe('formatBrazilianPersonName', () => {
  it('capitaliza nome em caixa alta', () => {
    expect(formatBrazilianPersonName('JOÃO DA SILVA')).toBe('João da Silva');
  });

  it('capitaliza nome em caixa baixa', () => {
    expect(formatBrazilianPersonName('joão da silva')).toBe('João da Silva');
  });

  it('mantém preposições em minúscula, exceto na primeira palavra', () => {
    expect(formatBrazilianPersonName('MARIA DAS DORES DOS SANTOS')).toBe(
      'Maria das Dores dos Santos',
    );
  });

  it('capitaliza nome hifenizado', () => {
    expect(formatBrazilianPersonName('ANA-MARIA DE OLIVEIRA')).toBe('Ana-Maria de Oliveira');
  });

  it('colapsa espaços duplicados e remove espaços nas pontas', () => {
    expect(formatBrazilianPersonName('  PEDRO   ALVES  ')).toBe('Pedro Alves');
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(formatBrazilianPersonName('   ')).toBe('');
  });
});
