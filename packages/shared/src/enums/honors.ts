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
  'past_presidente_conselho_consultivo',
  'pos_mortem',
  'outro',
] as const;
export type MemberTitleKey = (typeof MEMBER_TITLE_KEYS)[number];

export const MEMBER_TITLE_LABELS: Record<MemberTitleKey, string> = {
  mestre_instalado: 'Mestre Instalado',
  membro_honorario: 'Membro Honorário',
  membro_remido: 'Membro Remido',
  benfeitor: 'Benfeitor',
  fundador: 'Fundador',
  past_presidente_conselho_consultivo: 'Past-Presidente do Conselho Consultivo',
  // Título/condição concedido postumamente (mock-up "Perfil VL6", inventário
  // de conteúdo preservado) — só faz sentido pra Irmãos em situação
  // `falecido`, mas o cadastro em si não impõe essa regra (mesmo tratamento
  // dos demais títulos: quem decide se aplica é quem cadastra).
  pos_mortem: 'Pós Mortem',
  outro: 'Outro',
};

/**
 * Tipo de Honraria/Condecoração (levantamento institucional §3) —
 * `membro_honorario` cobre também o levantamento §5 ("Membros Honorários da
 * VL6"), já que estrutura e campos são os mesmos (instituição concedente,
 * data, ato, motivo, diploma/foto), só o rótulo muda.
 */
export const HONOR_TYPE_KEYS = [
  'medalha',
  'comenda',
  'diploma',
  'certificado',
  'homenagem',
  'membro_honorario',
] as const;
export type HonorTypeKey = (typeof HONOR_TYPE_KEYS)[number];

export const HONOR_TYPE_LABELS: Record<HonorTypeKey, string> = {
  medalha: 'Medalha',
  comenda: 'Comenda',
  diploma: 'Diploma',
  certificado: 'Certificado',
  homenagem: 'Homenagem',
  membro_honorario: 'Membro Honorário',
};
