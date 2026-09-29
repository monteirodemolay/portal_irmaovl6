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
    dia: 22,
    mes: 9,
    anosCompletos: 63,
    diasAte: 1,
    conjugeNome: null,
    filhoNome: null,
    ...overrides,
  };
}

describe('anniversaryHeadline', () => {
  it('mostra `entry.dia`/`entry.mes` (números), nunca deriva de `entry.data`', () => {
    // Bug relatado pelo Administrador, 2ª ocorrência: mesmo depois de
    // corrigido o cálculo de "hoje" no servidor, 22/09 continuava
    // aparecendo como 21/09 — porque este painel é um Client Component, e
    // `entry.data` (um `Date`) é serializado como instante ISO ao
    // atravessar a fronteira servidor/cliente e reconstruído no navegador
    // do Irmão: `getDate()` nesse `Date` reconstruído lê o fuso do
    // NAVEGADOR (São Paulo, UTC-3), não o do servidor, empurrando a data um
    // dia pra trás. `entry.data` aqui está deliberadamente "errado"
    // (21/09) pra provar que `anniversaryHeadline` ignora esse campo por
    // completo — só `dia`/`mes` (números, imunes a fuso horário) importam.
    const headline = anniversaryHeadline(buildEntry({ data: new Date(2026, 8, 21) }));
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
