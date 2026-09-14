import type { HonorTypeKey, MemberTitleKey } from '@vl6/shared';

/**
 * Selos (imagem) de cada Título/Condição e tipo de Honraria — usados na
 * Galeria de Honra e na aba "Trajetória e Honrarias" do Perfil pra dar
 * identidade visual própria a cada tipo, em vez de um único ícone genérico
 * repetido. Arquivos em `apps/web/public/honors/`.
 */
export const MEMBER_TITLE_BADGE_ICON: Record<MemberTitleKey, string> = {
  mestre_instalado: '/honors/mestre-instalado.png',
  membro_honorario: '/honors/membro-honorario-titulo.png',
  membro_remido: '/honors/membro-remido.png',
  benfeitor: '/honors/benfeitor.png',
  fundador: '/honors/fundador.png',
  outro: '/honors/outro-titulo.png',
};

export const HONOR_TYPE_BADGE_ICON: Record<HonorTypeKey, string> = {
  medalha: '/honors/medalha.png',
  comenda: '/honors/comenda.png',
  diploma: '/honors/diploma.png',
  certificado: '/honors/certificado.png',
  homenagem: '/honors/homenagem.png',
  membro_honorario: '/honors/membro-honorario-honraria.png',
};
