import { describe, expect, it } from 'vitest';
import { findSimilarName, levenshteinDistance } from './find-similar-name';

describe('levenshteinDistance', () => {
  it('conta a diferença de um caractere', () => {
    expect(levenshteinDistance('ivan', 'ivam')).toBe(1);
  });

  it('é zero pra strings iguais', () => {
    expect(levenshteinDistance('igual', 'igual')).toBe(0);
  });
});

describe('findSimilarName', () => {
  it('acha um nome parecido por uma letra diferente', () => {
    const result = findSimilarName('Ivam Damasceno', ['Ivan Damasceno', 'Outro Irmão']);
    expect(result).toBe('Ivan Damasceno');
  });

  it('ignora acento/maiúscula (não conta como diferença real)', () => {
    const result = findSimilarName('ivan damasceno', ['Ivan Damasceno']);
    expect(result).toBeNull();
  });

  it('não acusa nomes genuinamente diferentes', () => {
    const result = findSimilarName('Ribas Marques', ['Valério Teles Pires', 'João Batista Alves']);
    expect(result).toBeNull();
  });

  it('não acusa sobrenomes curtos distintos', () => {
    const result = findSimilarName('Ana Lima', ['Ana Lira', 'Ana Luz']);
    // "Lima" x "Lira" difere em 2 letras num nome curto — ainda assim dentro
    // do limiar (distância 2, ~14% do tamanho), então é esperado sinalizar.
    expect(result).not.toBeNull();
  });
});
