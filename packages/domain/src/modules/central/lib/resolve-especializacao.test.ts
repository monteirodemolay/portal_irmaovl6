import { describe, expect, it } from 'vitest';
import { resolveEspecializacao } from './resolve-especializacao';

describe('resolveEspecializacao', () => {
  it('resolve uma chave válida pra área atual', () => {
    const result = resolveEspecializacao({
      areaAtuacao: 'direito',
      especializacao: 'trabalhista',
      especializacaoOutra: null,
    });
    expect(result).toEqual({ key: 'trabalhista', label: 'Trabalhista' });
  });

  it('resolve "outra" usando o texto livre informado', () => {
    const result = resolveEspecializacao({
      areaAtuacao: 'saude',
      especializacao: 'outra',
      especializacaoOutra: 'Medicina do Trabalho',
    });
    expect(result).toEqual({ key: 'outra', label: 'Medicina do Trabalho' });
  });

  it('cai no rótulo padrão "Outra" quando especializacaoOutra está vazio', () => {
    const result = resolveEspecializacao({
      areaAtuacao: 'saude',
      especializacao: 'outra',
      especializacaoOutra: null,
    });
    expect(result).toEqual({ key: 'outra', label: 'Outra' });
  });

  it('devolve null quando não há especialização informada', () => {
    expect(
      resolveEspecializacao({ areaAtuacao: 'direito', especializacao: null, especializacaoOutra: null }),
    ).toBeNull();
    expect(resolveEspecializacao(null)).toBeNull();
    expect(resolveEspecializacao(undefined)).toBeNull();
  });

  it('devolve null quando não há área informada — não dá pra validar sem área', () => {
    const result = resolveEspecializacao({
      areaAtuacao: null,
      especializacao: 'trabalhista',
      especializacaoOutra: null,
    });
    expect(result).toBeNull();
  });

  it('nunca lança erro pra chave que não pertence mais à área (dado legado) — bucketa em "outra"', () => {
    const result = resolveEspecializacao({
      areaAtuacao: 'direito',
      especializacao: 'cardiologia' as never,
      especializacaoOutra: null,
    });
    expect(result).toEqual({ key: 'outra', label: 'cardiologia' });
  });
});
