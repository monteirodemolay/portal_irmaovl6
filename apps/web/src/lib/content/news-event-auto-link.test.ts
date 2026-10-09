import { describe, expect, it } from 'vitest';
import { findConfidentNewsEventMatch } from './news-event-auto-link';

const base = {
  deletedAt: null as Date | null,
};

describe('findConfidentNewsEventMatch', () => {
  it('vincula automaticamente quando data e assunto identificam claramente o evento', () => {
    const result = findConfidentNewsEventMatch(
      'Filhas de Jó realizam Noite de Massas marcada por integração e fraternidade',
      new Date('2026-10-05T12:00:00-03:00'),
      [
        {
          ...base,
          id: 'noite-massas',
          titulo: 'Noite de Massas — Filhas de Jó',
          dataInicio: new Date('2026-10-05T19:00:00-03:00'),
        },
        {
          ...base,
          id: 'jantar-solene',
          titulo: 'Jantar Solene',
          dataInicio: new Date('2026-10-05T20:00:00-03:00'),
        },
      ],
    );

    expect(result?.event.id).toBe('noite-massas');
  });

  it('não inventa vínculo quando há duas opções parecidas', () => {
    const result = findConfidentNewsEventMatch(
      'Sessão Aprendiz reúne irmãos',
      new Date('2026-09-21T12:00:00-03:00'),
      [
        {
          ...base,
          id: 'a',
          titulo: 'Sessão Aprendiz',
          dataInicio: new Date('2026-09-21T19:00:00-03:00'),
        },
        {
          ...base,
          id: 'b',
          titulo: 'Sessão Aprendiz',
          dataInicio: new Date('2026-09-21T20:00:00-03:00'),
        },
      ],
    );

    expect(result).toBeNull();
  });

  it('não relaciona acontecimentos distantes no tempo', () => {
    const result = findConfidentNewsEventMatch(
      'Noite de Massas — Filhas de Jó',
      new Date('2026-10-05T12:00:00-03:00'),
      [
        {
          ...base,
          id: 'antigo',
          titulo: 'Noite de Massas — Filhas de Jó',
          dataInicio: new Date('2026-09-01T19:00:00-03:00'),
        },
      ],
    );

    expect(result).toBeNull();
  });
});
