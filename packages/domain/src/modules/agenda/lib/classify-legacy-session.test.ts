import { describe, expect, it } from 'vitest';
import { classifyLegacySession } from './classify-legacy-session';

describe('classifyLegacySession', () => {
  it('"Sessão Ordinária" → Ordinária/Regular', () => {
    expect(classifyLegacySession('Sessão Ordinária', null)).toEqual({
      sessionType: 'ordinaria',
      sessionNature: 'regular',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    });
  });

  it('"Sessão Administrativa" → Ordinária/Administrativa', () => {
    expect(classifyLegacySession('Sessão Administrativa', null)).toMatchObject({
      sessionType: 'ordinaria',
      sessionNature: 'administrativa',
      reviewRequired: false,
    });
  });

  it('"Sessão Ordinária Administrativa" → Ordinária/Administrativa', () => {
    expect(classifyLegacySession('Sessão Ordinária Administrativa', null)).toMatchObject({
      sessionType: 'ordinaria',
      sessionNature: 'administrativa',
      reviewRequired: false,
    });
  });

  it('"Sessão de Instrução" → Ordinária/Instrução', () => {
    expect(classifyLegacySession('Sessão de Instrução', null)).toMatchObject({
      sessionType: 'ordinaria',
      sessionNature: 'instrucao',
      reviewRequired: false,
    });
  });

  it('"Sessão Extraordinária" → Extraordinária/Assunto Específico', () => {
    expect(classifyLegacySession('Sessão Extraordinária', null)).toMatchObject({
      sessionType: 'extraordinaria',
      sessionNature: 'assunto_especifico',
      reviewRequired: false,
    });
  });

  it('"Sessão Magna" bare → Magna/Outra, pede revisão', () => {
    expect(classifyLegacySession('Sessão Magna', null)).toEqual({
      sessionType: 'magna',
      sessionNature: 'outra',
      degreeWork: 'a_definir',
      reviewRequired: true,
    });
  });

  it('"Sessão Magna de Iniciação" → Magna/Iniciação/Grau 1', () => {
    expect(classifyLegacySession('Sessão Magna de Iniciação', null)).toEqual({
      sessionType: 'magna',
      sessionNature: 'iniciacao',
      degreeWork: 'aprendiz',
      reviewRequired: false,
    });
  });

  it('"Sessão de Iniciação" (sem "Magna" no texto) também mapeia pra Iniciação/Grau 1', () => {
    expect(classifyLegacySession('Sessão de Iniciação', null)).toMatchObject({
      sessionType: 'magna',
      sessionNature: 'iniciacao',
      degreeWork: 'aprendiz',
    });
  });

  it('"Sessão Magna de Elevação" → Magna/Elevação/Grau 2', () => {
    expect(classifyLegacySession('Sessão Magna de Elevação', null)).toEqual({
      sessionType: 'magna',
      sessionNature: 'elevacao',
      degreeWork: 'companheiro',
      reviewRequired: false,
    });
  });

  it('"Sessão Magna de Exaltação" → Magna/Exaltação/Grau 3', () => {
    expect(classifyLegacySession('Sessão Magna de Exaltação', null)).toEqual({
      sessionType: 'magna',
      sessionNature: 'exaltacao',
      degreeWork: 'mestre',
      reviewRequired: false,
    });
  });

  it('"Sessão Magna de Posse" → Magna/Posse da Administração', () => {
    expect(classifyLegacySession('Sessão Magna de Posse', null)).toMatchObject({
      sessionType: 'magna',
      sessionNature: 'posse_administracao',
      reviewRequired: false,
    });
  });

  it('"Sessão Pública" sozinha não dá pra inferir o Tipo — pede revisão', () => {
    const result = classifyLegacySession('Sessão Pública', null);
    expect(result.reviewRequired).toBe(true);
  });

  it('texto sem nenhum sinal reconhecível pede revisão, nunca inventa', () => {
    const result = classifyLegacySession('Verdadeira Luz recebe visitante ilustre', null);
    expect(result.reviewRequired).toBe(true);
    expect(result.sessionNature).toBe('outra');
  });

  it('legado com grau "magna" (sem "magna" no título) também é reconhecido', () => {
    const result = classifyLegacySession('Encontro especial da Loja', 'magna');
    expect(result.sessionType).toBe('magna');
    expect(result.reviewRequired).toBe(true);
  });
});
