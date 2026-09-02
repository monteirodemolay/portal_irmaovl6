import {
  SESSION_NATURE_LABELS,
  SESSION_TYPE_LABELS,
  type SessionAccessKind,
  type SessionType,
} from '../enums/agenda';

export interface SessionNameInput {
  sessionType: SessionType;
  /** Chave de `SESSION_NATURES_BY_TYPE[sessionType]` — aceita chave desconhecida (cai no valor cru). */
  sessionNature: string;
  access?: SessionAccessKind | null;
}

/**
 * Função central de nomenclatura de Sessão — único lugar que decide como
 * "Sessão Magna de Iniciação" ou "Sessão Ordinária Administrativa" viram
 * texto, pra nenhuma tela do Portal inventar sua própria concatenação (item
 * 6 do pedido do Administrador). Não é concatenação literal dos 3 campos:
 * cada combinação de Tipo tem sua própria regra gramatical —
 * "Magna" + Natureza usa "de" ("Sessão Magna de Iniciação"), "Ordinária"/
 * "Extraordinária" não ("Sessão Ordinária Administrativa"), e "Pública"
 * (Acesso, nunca Tipo) entra como qualificador extra quando presente
 * ("Sessão Magna Pública Comemorativa").
 *
 * "Regular"/"Outra" não aparecem no nome — uma Sessão Ordinária Regular é
 * só "Sessão Ordinária" (natureza "padrão", não vale a pena repetir), e
 * "Outra" não tem rótulo próprio pra concatenar.
 */
export function formatSessionName(input: SessionNameInput): string {
  const typeLabel = SESSION_TYPE_LABELS[input.sessionType];
  const natureLabel = SESSION_NATURE_LABELS[input.sessionNature] ?? (input.sessionNature || null);
  const showNature = natureLabel && !['regular', 'outra', 'Outra'].includes(input.sessionNature);
  const isPublicAccess = input.access === 'publica';

  const parts = ['Sessão', typeLabel];
  if (isPublicAccess) parts.push('Pública');

  if (!showNature) return parts.join(' ');

  // "de" só entra quando Magna aparece sozinha ("Sessão Magna de
  // Iniciação") — com o qualificador "Pública" no meio, o "de" soa mal
  // ("Sessão Magna Pública de Comemorativa"); o pedido do Administrador já
  // mostra o resultado esperado sem ele nesse caso.
  if (input.sessionType === 'magna' && !isPublicAccess) {
    parts.push('de', natureLabel!);
  } else {
    parts.push(natureLabel!);
  }
  return parts.join(' ');
}
