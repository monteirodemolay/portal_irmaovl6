import { describe, expect, it } from 'vitest';
import type { UpcomingAnniversaryEntry } from '@vl6/domain';
import { anniversaryHeadline } from './anniversary-labels';

function buildEntry(overrides: Partial<UpcomingAnniversaryEntry> = {}): UpcomingAnniversaryEntry {
  return {
    memberId: 'member-1',
    nomeCompleto: 'Irmão de Teste',
    fotoUrl: null,
    grau: 'mestre',
    kind: 'nascimento',
    data: new Date(2026, 8, 22), // 22/09, construído local — mesmo padrão de `computeNextOccurrence`
    anosCompletos: 63,
    diasAte: 1,
    conjugeNome: null,
    filhoNome: null,
    ...overrides,
  };
}

describe('anniversaryHeadline', () => {
  it('mostra o dia/mês exatamente como construído em `entry.data`, sem deslocar por fuso horário', () => {
    // Bug relatado pelo Administrador: aniversário de 22/09 aparecendo como
    // 21/09 — causado por formatar uma data-calendário pura (sem
    // significado real de horário) forçando conversão de fuso horário
    // (`timeZone: 'America/Sao_Paulo'`), que empurrava a meia-noite
    // construída no fuso do servidor pro dia anterior.
    const headline = anniversaryHeadline(buildEntry());
    expect(headline).toContain('22/09');
    expect(headline).not.toContain('21/09');
  });

  it('inclui o nome da cônjuge no aniversário dela', () => {
    const headline = anniversaryHeadline(
      buildEntry({ kind: 'conjuge', conjugeNome: 'Maria de Teste' }),
    );
    expect(headline).toBe('Aniversário de Maria de Teste amanhã (22/09)');
  });

  it('inclui o nome do filho no aniversário dele', () => {
    const headline = anniversaryHeadline(buildEntry({ kind: 'filho', filhoNome: 'João Filho' }));
    expect(headline).toBe('Aniversário de João Filho amanhã (22/09)');
  });
});
