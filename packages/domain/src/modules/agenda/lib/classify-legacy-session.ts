import { normalizeNameForSearch, type SessionType, type SessionWorkDegree } from '@vl6/shared';
import type { SessionDegree } from '@vl6/shared';

export interface LegacySessionClassification {
  sessionType: SessionType;
  sessionNature: string;
  degreeWork: SessionWorkDegree;
  /** `true` quando o texto legado não deu segurança suficiente pra inferir a Natureza — nunca inventa, cai no melhor palpite de Tipo com Natureza "outra" e pede revisão. */
  reviewRequired: boolean;
}

/**
 * Mapeamento inicial pedido pelo Administrador (item 8) — usado só por
 * `SeedSessionClassificationUseCase` pra migrar Sessões já cadastradas
 * (`titulo`/`grau` livres) pra classificação estruturada. Ordem importa:
 * padrões mais específicos ("sessão magna de iniciação") são checados antes
 * dos genéricos ("sessão magna"), senão o genérico captura tudo primeiro.
 *
 * Nunca adivinha quando não há sinal suficiente — cai em Natureza "outra"
 * com `reviewRequired: true`, nunca inventa uma Natureza/Grau específicos
 * sem base no texto original (item 9: "não inferir informações
 * inexistentes").
 */
export function classifyLegacySession(
  titulo: string,
  legacyGrau: SessionDegree | null,
): LegacySessionClassification {
  const t = normalizeNameForSearch(titulo);

  const has = (...terms: string[]) => terms.every((term) => t.includes(term));

  // Magna — mais específico primeiro (iniciação/elevação/exaltação/posse).
  if (has('iniciac')) {
    return { sessionType: 'magna', sessionNature: 'iniciacao', degreeWork: 'aprendiz', reviewRequired: false };
  }
  if (has('elevac')) {
    return { sessionType: 'magna', sessionNature: 'elevacao', degreeWork: 'companheiro', reviewRequired: false };
  }
  if (has('exaltac')) {
    return { sessionType: 'magna', sessionNature: 'exaltacao', degreeWork: 'mestre', reviewRequired: false };
  }
  if (has('posse')) {
    return {
      sessionType: 'magna',
      sessionNature: 'posse_administracao',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }

  // Extraordinária — checado ANTES de Ordinária de propósito: a palavra
  // "ordinaria" aparece como substring dentro de "extraordinaria" (mesma
  // palavra, sem espaço), então checar Ordinária primeiro classificaria
  // toda "Sessão Extraordinária..." como Ordinária por engano.
  if (has('extraordinaria', 'administrativa')) {
    return {
      sessionType: 'extraordinaria',
      sessionNature: 'administrativa',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }
  if (has('extraordinaria', 'instruc')) {
    return {
      sessionType: 'extraordinaria',
      sessionNature: 'instrucao',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }
  // Bare "Sessão Extraordinária" — mapeamento inicial explícito do pedido
  // (item 8), diferente de "Sessão Magna" bare abaixo (que pede revisão):
  // aqui o Administrador definiu o valor padrão, sem sinalizar revisão.
  if (has('extraordinaria')) {
    return {
      sessionType: 'extraordinaria',
      sessionNature: 'assunto_especifico',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }

  // Ordinária.
  if (has('administrativa')) {
    return {
      sessionType: 'ordinaria',
      sessionNature: 'administrativa',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }
  if (has('instruc')) {
    return {
      sessionType: 'ordinaria',
      sessionNature: 'instrucao',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }
  if (has('ordinaria')) {
    return {
      sessionType: 'ordinaria',
      sessionNature: 'regular',
      degreeWork: 'nao_se_aplica',
      reviewRequired: false,
    };
  }

  // "Sessão Magna" genérica (sem natureza identificável) ou "Sessão
  // Pública" (Acesso, não Tipo — não dá pra inferir o Tipo real só por
  // isso) — ambos ficam pra revisão manual, nunca um palpite de Natureza.
  if (has('magna') || legacyGrau === 'magna') {
    return { sessionType: 'magna', sessionNature: 'outra', degreeWork: 'a_definir', reviewRequired: true };
  }

  // Sem nenhum sinal reconhecível — melhor palpite é Ordinária (o tipo mais
  // comum de Sessão), sempre marcado pra revisão.
  return { sessionType: 'ordinaria', sessionNature: 'outra', degreeWork: 'a_definir', reviewRequired: true };
}
