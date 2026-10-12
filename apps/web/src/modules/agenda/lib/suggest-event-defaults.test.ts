import { describe, expect, it } from 'vitest';
import { suggestEventDefaults, type EventTemplate } from './suggest-event-defaults';

const t = (over: Partial<EventTemplate>): EventTemplate => ({
  id: 'x',
  tipo: 'sessao',
  titulo: 'Sessão Econômica',
  dataInicio: '2026-08-10T22:00:00Z',
  local: 'Templo da Verdadeira Luz - Ivan Damasceno',
  traje: 'Social completo',
  chegadaSugerida: '19:30',
  capacidadeMaxima: null,
  exigeConfirmacaoPresenca: true,
  ...over,
});

describe('suggestEventDefaults', () => {
  it('prefere o mesmo título, ignorando números, e o mais recente', () => {
    const list = [
      t({
        id: 'velho',
        titulo: 'Sessão Econômica 07/2026',
        dataInicio: '2026-07-10T22:00:00Z',
        traje: 'Velho',
      }),
      t({ id: 'novo', titulo: 'Sessão econômica 08/2026', traje: 'Novo' }),
      t({ id: 'outro', titulo: 'Banquete', tipo: 'confraternizacao' }),
    ];
    const s = suggestEventDefaults(list, { tipo: 'sessao', titulo: 'sessao economica 09/2026' });
    expect(s?.source.id).toBe('novo');
    expect(s?.reason).toBe('mesmo título');
    expect(s?.defaults.traje).toBe('Novo');
  });

  it('aceita título parecido do mesmo tipo', () => {
    const s = suggestEventDefaults([t({ id: 'a', titulo: 'Sessão Magna de Iniciação' })], {
      tipo: 'sessao',
      titulo: 'Magna de Iniciação',
    });
    expect(s?.reason).toBe('título parecido');
  });

  it('sem título, repete o último do mesmo tipo', () => {
    const list = [
      t({
        id: 'a',
        tipo: 'palestra',
        titulo: 'P1',
        local: 'Salão',
        dataInicio: '2026-01-01T10:00:00Z',
      }),
      t({
        id: 'b',
        tipo: 'palestra',
        titulo: 'P2',
        local: 'Auditório',
        dataInicio: '2026-03-01T10:00:00Z',
      }),
    ];
    const s = suggestEventDefaults(list, { tipo: 'palestra', titulo: '' });
    expect(s?.source.id).toBe('b');
    expect(s?.defaults.local).toBe('Auditório');
  });

  it('com título digitado e sem parecido, não chuta', () => {
    expect(
      suggestEventDefaults([t({})], { tipo: 'sessao', titulo: 'Inauguração do jardim' }),
    ).toBeNull();
  });

  it('não sugere para recesso/aniversário nem sem tipo', () => {
    expect(suggestEventDefaults([t({})], { tipo: 'recesso', titulo: '' })).toBeNull();
    expect(suggestEventDefaults([t({})], { tipo: '', titulo: 'Sessão Econômica' })).toBeNull();
  });

  it('só repete campos que existem', () => {
    const s = suggestEventDefaults(
      [t({ traje: null, chegadaSugerida: ' ', exigeConfirmacaoPresenca: false })],
      { tipo: 'sessao', titulo: 'Sessão Econômica' },
    );
    expect(Object.keys(s!.defaults)).toEqual(['local']);
  });
});
