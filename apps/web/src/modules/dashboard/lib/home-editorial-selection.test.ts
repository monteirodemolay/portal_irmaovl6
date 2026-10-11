import { describe, expect, it } from 'vitest';
import type { Event, Announcement } from '@vl6/domain';
import { selectHomeEvents, sortHomeAnnouncements } from './home-editorial-selection';

describe('seleção compartilhada do Início', () => {
  it('ocultos não ocupam vagas e sessões não se misturam com eventos', () => {
    const events = ['oculto', 's1', 'e1', 's2', 's3', 's4'].map(
      (id) =>
        ({
          id,
          tipo: id === 'e1' ? 'evento' : 'sessao',
          exibirNaTelaInicial: id !== 'oculto',
        }) as Event,
    );
    const selected = selectHomeEvents(events);
    expect(selected.sessions.map((e) => e.id)).toEqual(['s1', 's2', 's3']);
    expect(selected.events.map((e) => e.id)).toEqual(['e1']);
    expect(events).toHaveLength(6);
  });
  it('avisos fixados precedem prioridade e mantém a ordem de entrada para empates', () => {
    const items = [
      { id: 'a', destacar: false, prioridade: 'alta' },
      { id: 'b', destacar: true, prioridade: 'baixa' },
      { id: 'c', destacar: false, prioridade: 'alta' },
    ] as Announcement[];
    expect(sortHomeAnnouncements(items).map((a) => a.id)).toEqual(['b', 'a', 'c']);
    expect(items[0]!.id).toBe('a');
  });
});
