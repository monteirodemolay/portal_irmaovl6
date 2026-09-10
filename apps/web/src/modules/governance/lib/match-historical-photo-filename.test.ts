import { describe, expect, it } from 'vitest';
import { HISTORICAL_BOARD_TERMS_VL6 } from '@vl6/domain';
import { matchHistoricalPhotoFilename } from './match-historical-photo-filename';

const KNOWN_NAMES = Array.from(
  new Set(
    HISTORICAL_BOARD_TERMS_VL6.flatMap((term) => term.segments.map((s) => s.nomeCompleto)),
  ),
);

describe('matchHistoricalPhotoFilename', () => {
  it.each([
    ['01. Ribas Marques 78.79.png', 'Ribas Marques'],
    ['02. Valério Teles Pires 79.80.png', 'Valério Teles Pires'],
    ['13. Ridomar Macedo de Lima - 90.91.png', 'Ridomar Macedo de Lima'],
    ['18. Apareido Molero Romero - 95.96.png', 'Aparecido Molero Romero'],
    ['19. Osvaldo Monteiro dos Santos - 96.97.png', 'Osvaldo Monteiro dos Santos'],
    ['26. Deoclides Almeida da Silva - 03.04.png', 'Deoclides Almeida da Silva'],
    ['44. Dino Moraes de Sousa - 20.21.png', 'Dino Moraes de Sousa'],
    ['48_Timoteo David Marcelino de Oliveira_24_25.png', 'Timóteo David Marcelino de Oliveira'],
    ['49Helton Chacarosque_25_26.png', 'Helton José Chacarosque da Silva'],
    ['36. Ricardo Hahimoto de Menezes - 12.13.png', 'Ricardo Hahimoto de Menezes'],
  ])('casa "%s" com "%s"', (filename, expected) => {
    expect(matchHistoricalPhotoFilename(filename, KNOWN_NAMES)).toBe(expected);
  });

  it('não casa um arquivo sem relação com nenhum nome conhecido', () => {
    expect(matchHistoricalPhotoFilename('foto-aleatoria-123.png', KNOWN_NAMES)).toBeNull();
  });

  it('não casa um nome parcial fraco (1 palavra em comum só, nome com 2+ palavras)', () => {
    expect(matchHistoricalPhotoFilename('01. José da Silva Neto.png', ['José Eustáquio de Lima'])).toBeNull();
  });
});
