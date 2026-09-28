import { describe, expect, it } from 'vitest';
import { normalizeEventLocation, VL6_TEMPLE_LOCATION } from './normalize-event-location';

describe('normalizeEventLocation', () => {
  it('renomeia os dois valores legados, inclusive variações de espaços e maiúsculas', () => {
    for (const value of ['Templo da Verdadeira Luz', 'A confirmar', ' a CONFIRMAR ', 'Templo   da Verdadeira Luz ']) {
      expect(normalizeEventLocation(value)).toBe(VL6_TEMPLE_LOCATION);
    }
  });
  it('preserva outras localidades e o nome correto', () => {
    for (const value of [VL6_TEMPLE_LOCATION, 'Auditório municipal', 'A confirmar endereço', 'Loja Maçônica Verdadeira Luz nº 06', '']) {
      expect(normalizeEventLocation(value)).toBe(value);
    }
  });
});
