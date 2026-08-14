import type { AnniversaryKind, UpcomingAnniversaryEntry } from '@vl6/domain';

export const ANNIVERSARY_KIND_LABELS: Record<AnniversaryKind, string> = {
  iniciacao: 'Iniciação',
  elevacao: 'Elevação',
  exaltacao: 'Exaltação',
  nascimento: 'Aniversário',
};

function dayLabel(diasAte: number): string {
  if (diasAte === 0) return 'hoje';
  if (diasAte === 1) return 'amanhã';
  return `em ${diasAte} dias`;
}

/**
 * Texto do card do painel de aniversários. Natalício nunca expõe idade
 * (mesma convenção do cron `birthday-reminder`, que só anuncia "Aniversário
 * de {nome}" sem revelar quantos anos) — só as datas maçônicas (Iniciação/
 * Elevação/Exaltação) contam anos completos, que é o dado que o Irmão
 * pediu para destacar.
 */
export function anniversaryHeadline(entry: UpcomingAnniversaryEntry): string {
  const dia = dayLabel(entry.diasAte);
  if (entry.kind === 'nascimento') {
    return `Aniversário ${dia}`;
  }
  const anos = entry.anosCompletos === 1 ? '1 ano' : `${entry.anosCompletos} anos`;
  return `${anos} de ${ANNIVERSARY_KIND_LABELS[entry.kind]} ${dia}`;
}
