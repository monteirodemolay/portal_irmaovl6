import { describe, expect, it } from 'vitest';
import { formatSessionName } from './format-session-name';

describe('formatSessionName', () => {
  it('Ordinária + Administrativa', () => {
    expect(formatSessionName({ sessionType: 'ordinaria', sessionNature: 'administrativa' })).toBe(
      'Sessão Ordinária Administrativa',
    );
  });

  it('Ordinária + Regular não repete a natureza no nome', () => {
    expect(formatSessionName({ sessionType: 'ordinaria', sessionNature: 'regular' })).toBe(
      'Sessão Ordinária',
    );
  });

  it('Extraordinária + Administrativa', () => {
    expect(
      formatSessionName({ sessionType: 'extraordinaria', sessionNature: 'administrativa' }),
    ).toBe('Sessão Extraordinária Administrativa');
  });

  it('Magna + Iniciação usa "de"', () => {
    expect(formatSessionName({ sessionType: 'magna', sessionNature: 'iniciacao' })).toBe(
      'Sessão Magna de Iniciação',
    );
  });

  it('Magna + Exaltação usa "de"', () => {
    expect(formatSessionName({ sessionType: 'magna', sessionNature: 'exaltacao' })).toBe(
      'Sessão Magna de Exaltação',
    );
  });

  it('Magna + Comemorativa + acesso Pública não usa "de"', () => {
    expect(
      formatSessionName({ sessionType: 'magna', sessionNature: 'comemorativa', access: 'publica' }),
    ).toBe('Sessão Magna Pública Comemorativa');
  });

  it('Magna sozinha (sem natureza específica) só mostra o Tipo', () => {
    expect(formatSessionName({ sessionType: 'magna', sessionNature: 'outra' })).toBe(
      'Sessão Magna',
    );
  });
});
