import { describe, expect, it } from 'vitest';
import { buildAnnouncementDraft } from './announcement-draft';

const base = {
  titulo: 'Sessão Econômica',
  dataInicio: new Date('2026-10-15T22:30:00Z'), // 19:30 em São Paulo
  local: 'Templo da Verdadeira Luz - Ivan Damasceno',
  traje: 'Social completo',
  chegadaSugerida: '19:00',
  exigeConfirmacaoPresenca: true,
};

describe('buildAnnouncementDraft', () => {
  it('monta o texto com horário local e todos os dados existentes', () => {
    const { descricao, dataExpiracao } = buildAnnouncementDraft(base);
    expect(descricao).toContain('Sessão Econômica:');
    expect(descricao).toContain('às 19:30');
    expect(descricao).toContain('em Templo da Verdadeira Luz - Ivan Damasceno');
    expect(descricao).toContain('Chegada sugerida: 19:00.');
    expect(descricao).toContain('Traje: Social completo.');
    expect(descricao).toContain('Confirme sua presença');
    expect(dataExpiracao).toBe('2026-10-15');
  });

  it('usa o dia de São Paulo, não o UTC, para expirar', () => {
    const late = buildAnnouncementDraft({ ...base, dataInicio: new Date('2026-10-16T01:30:00Z') });
    expect(late.dataExpiracao).toBe('2026-10-15');
  });

  it('omite o que não existe', () => {
    const { descricao } = buildAnnouncementDraft({
      ...base,
      traje: null,
      chegadaSugerida: ' ',
      exigeConfirmacaoPresenca: false,
      local: '',
    });
    expect(descricao.split('\n')).toHaveLength(1);
    expect(descricao).not.toContain(' em ');
  });
});
