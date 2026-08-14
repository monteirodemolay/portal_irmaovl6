import { describe, expect, it } from 'vitest';
import { resolveAreaAtuacao } from './resolve-area-atuacao';

describe('resolveAreaAtuacao', () => {
  it('resolve uma chave válida da taxonomia', () => {
    const result = resolveAreaAtuacao({ areaAtuacao: 'engenharia', areaAtuacaoOutra: null });
    expect(result).toEqual({ key: 'engenharia', label: 'Engenharia' });
  });

  it('resolve "outra" usando o texto livre informado', () => {
    const result = resolveAreaAtuacao({
      areaAtuacao: 'outra',
      areaAtuacaoOutra: 'Astronomia amadora',
    });
    expect(result).toEqual({ key: 'outra', label: 'Astronomia amadora' });
  });

  it('cai no rótulo padrão "Outra" quando areaAtuacaoOutra está vazio', () => {
    const result = resolveAreaAtuacao({ areaAtuacao: 'outra', areaAtuacaoOutra: null });
    expect(result).toEqual({ key: 'outra', label: 'Outra' });
  });

  it('devolve null quando não há área informada', () => {
    expect(resolveAreaAtuacao({ areaAtuacao: null, areaAtuacaoOutra: null })).toBeNull();
    expect(resolveAreaAtuacao(null)).toBeNull();
    expect(resolveAreaAtuacao(undefined)).toBeNull();
  });

  it('nunca lança erro pra valor legado (texto livre pré-taxonomia) — bucketa em "outra"', () => {
    const result = resolveAreaAtuacao({
      areaAtuacao: 'Tecnologia da Informação' as never,
      areaAtuacaoOutra: null,
    });
    expect(result).toEqual({ key: 'outra', label: 'Tecnologia da Informação' });
  });
});
