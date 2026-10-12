export interface AnnouncementDraftSource {
  titulo: string;
  dataInicio: Date;
  local: string;
  traje: string | null;
  chegadaSugerida: string | null;
  exigeConfirmacaoPresenca: boolean;
}

export interface AnnouncementDraft {
  descricao: string;
  /** `YYYY-MM-DD`, no fuso de São Paulo: o aviso expira no dia do acontecimento. */
  dataExpiracao: string;
}

const TZ = 'America/Sao_Paulo';

function part(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...options }).format(date);
}

/**
 * Rascunho do aviso, montado só com dados que o acontecimento já tem. Fica
 * como rascunho editável: nada é publicado sozinho.
 */
export function buildAnnouncementDraft(event: AnnouncementDraftSource): AnnouncementDraft {
  const day = part(event.dataInicio, { weekday: 'long', day: '2-digit', month: '2-digit' });
  const time = part(event.dataInicio, { hour: '2-digit', minute: '2-digit', hour12: false });
  const lines = [
    `${event.titulo}: ${day}, às ${time}${event.local.trim() ? `, em ${event.local.trim()}` : ''}.`,
  ];
  if (event.chegadaSugerida?.trim())
    lines.push(`Chegada sugerida: ${event.chegadaSugerida.trim()}.`);
  if (event.traje?.trim()) lines.push(`Traje: ${event.traje.trim()}.`);
  if (event.exigeConfirmacaoPresenca) lines.push('Confirme sua presença pelo Portal.');
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(event.dataInicio);
  return { descricao: lines.join('\n'), dataExpiracao: iso };
}
