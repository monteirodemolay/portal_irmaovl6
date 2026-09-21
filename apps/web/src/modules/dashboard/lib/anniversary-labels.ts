import type { AnniversaryKind, UpcomingAnniversaryEntry } from '@vl6/domain';

export const ANNIVERSARY_KIND_LABELS: Record<AnniversaryKind, string> = {
  iniciacao: 'Iniciação',
  elevacao: 'Elevação',
  exaltacao: 'Exaltação',
  nascimento: 'Aniversário',
  conjuge: 'Aniversário da cônjuge',
  filho: 'Aniversário do(a) filho(a)',
};

/**
 * `entry.data` (`ListUpcomingAnniversariesUseCase`/`computeNextOccurrence`)
 * é uma data-calendário pura (dia/mês, sem significado real de horário),
 * montada com o construtor local de `Date` (`new Date(ano, mes, dia)`) — só
 * faz sentido lida pelos mesmos getters locais que a montaram
 * (`getDate`/`getMonth`). Formatar com `Intl.DateTimeFormat` forçando
 * `timeZone: 'America/Sao_Paulo'` tratava esse valor como um instante real,
 * e a conversão de fuso empurrava a meia-noite construída em UTC (fuso do
 * servidor) pro dia anterior em São Paulo (UTC-3) — bug relatado pelo
 * Administrador: aniversário de 22/09 aparecendo como 21/09.
 */
function formatShortDate(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
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
  if (entry.kind === 'filho') {
    const quem = entry.filhoNome ? `de ${entry.filhoNome}` : 'do(a) filho(a)';
    return `Aniversário ${quem} ${dia}`;
  }
  const anos = entry.anosCompletos === 1 ? '1 ano' : `${entry.anosCompletos} anos`;
  return `${anos} de ${ANNIVERSARY_KIND_LABELS[entry.kind]} ${dia}`;
}
