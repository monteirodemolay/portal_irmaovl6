/**
 * Títulos e Condições Maçônicas reconhecidos pela VL6 — recorte inicial do
 * levantamento institucional do Administrador ("LEVANTAMENTO DE
 * INFORMAÇÕES PARA OS PERFIS E ACERVO HISTÓRICO DA VL6" §2). `outro` cobre
 * qualquer título formal não listado aqui, com o nome digitado à mão em
 * `MemberTitle.tituloOutro`.
 */
export const MEMBER_TITLE_KEYS = [
  'mestre_instalado',
  'membro_honorario',
  'membro_remido',
  'benfeitor',
  'fundador',
  'outro',
] as const;
export type MemberTitleKey = (typeof MEMBER_TITLE_KEYS)[number];

export const MEMBER_TITLE_LABELS: Record<MemberTitleKey, string> = {
  mestre_instalado: 'Mestre Instalado',
  membro_honorario: 'Membro Honorário',
  membro_remido: 'Membro Remido',
  benfeitor: 'Benfeitor',
  fundador: 'Fundador',
  outro: 'Outro',
};
