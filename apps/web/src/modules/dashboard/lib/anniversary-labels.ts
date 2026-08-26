import { BRAZIL_TIME_ZONE } from '@vl6/shared';
import type { AnniversaryKind, UpcomingAnniversaryEntry } from '@vl6/domain';

export const ANNIVERSARY_KIND_LABELS: Record<AnniversaryKind, string> = {
  iniciacao: 'Iniciação',
  elevacao: 'Elevação',
  exaltacao: 'Exaltação',
  nascimento: 'Aniversário',
  conjuge: 'Aniversário da cônjuge',
};

function formatShortDate(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: BRAZIL_TIME_ZONE })
    .format(data)
    .slice(0, 5);
}

function dayLabel(diasAte: number, data: Date): string {
  const dataLabel = formatShortDate(data);
  if (diasAte === 0) return `hoje (${dataLabel})`;
  if (diasAte === 1) return `amanhã (${dataLabel})`;
  return `em ${diasAte} dias (${dataLabel})`;
}

/**
 * Texto do card do painel de aniversários. Natalício nunca expõe idade
 * (mesma convenção do cron `birthday-reminder`, que só anuncia "Aniversário
 * de {nome}" sem revelar quantos anos) — só as datas maçônicas (Iniciação/
 * Elevação/Exaltação) contam anos completos, que é o dado que o Irmão
 * pediu para destacar.
 */
export function anniversaryHeadline(entry: UpcomingAnniversaryEntry): string {
  const dia = dayLabel(entry.diasAte, entry.data);
  if (entry.kind === 'nascimento') {
    return `Aniversário ${dia}`;
  }
  if (entry.kind === 'conjuge') {
    const quem = entry.conjugeNome ? `de ${entry.conjugeNome}` : 'da cônjuge';
    return `Aniversário ${quem} ${dia}`;
  }
  const anos = entry.anosCompletos === 1 ? '1 ano' : `${entry.anosCompletos} anos`;
  return `${anos} de ${ANNIVERSARY_KIND_LABELS[entry.kind]} ${dia}`;
}
