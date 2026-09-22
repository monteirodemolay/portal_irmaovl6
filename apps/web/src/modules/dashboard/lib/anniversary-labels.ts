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
 * Recebe `dia`/`mes` como NÚMEROS (`UpcomingAnniversaryEntry.dia`/`mes`),
 * nunca um `Date` — este painel é um Client Component, então `entry` chega
 * via props que atravessam a fronteira servidor/cliente do React. Um
 * `Date` nessa travessia é serializado como instante ISO e reconstruído no
 * navegador do Irmão; ler `getDate()`/`getMonth()` desse `Date`
 * reconstruído usa o fuso horário do NAVEGADOR, não o do servidor — pra
 * quem está em São Paulo (UTC-3), isso empurrava a meia-noite (construída
 * no servidor) pro dia anterior. Bug relatado pelo Administrador:
 * aniversário de 22/09 aparecendo como 21/09 mesmo depois de corrigido o
 * cálculo de "hoje" no servidor — a causa era essa reidratação no cliente,
 * não o cálculo em si. Números primitivos não sofrem esse deslocamento.
 */
function formatShortDate(dia: number, mes: number): string {
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

function dayLabel(diasAte: number, dia: number, mes: number): string {
  const dataLabel = formatShortDate(dia, mes);
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
  const dia = dayLabel(entry.diasAte, entry.dia, entry.mes);
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
