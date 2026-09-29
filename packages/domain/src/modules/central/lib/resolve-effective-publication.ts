import type { PublicationSettings } from '../entities/publication-settings.entity';

export interface EffectivePublication {
  /** `true` quando o perfil deve mostrar conteúdo voluntário — ver comentário da função. */
  open: boolean;
  blocks: PublicationSettings['blocks'];
  contacts: PublicationSettings['contacts'];
  externalLinks: PublicationSettings['externalLinks'];
}

const OPEN_BLOCKS: PublicationSettings['blocks'] = {
  apresentacao: true,
  informacoesPessoais: true,
  profissional: true,
  empresa: true,
  informacoesMaconicas: true,
  competencias: true,
  servicos: true,
  afiliacoes: true,
  endereco: true,
  memoriaFotografica: true,
};
const CLOSED_BLOCKS: PublicationSettings['blocks'] = {
  apresentacao: false,
  informacoesPessoais: false,
  profissional: false,
  empresa: false,
  informacoesMaconicas: false,
  competencias: false,
  servicos: false,
  afiliacoes: false,
  endereco: false,
  memoriaFotografica: false,
};
const OPEN_CONTACTS: PublicationSettings['contacts'] = {
  telefone: true,
  whatsapp: true,
  email: true,
};
const CLOSED_CONTACTS: PublicationSettings['contacts'] = {
  telefone: false,
  whatsapp: false,
  email: false,
};
const OPEN_LINKS: PublicationSettings['externalLinks'] = {
  whatsapp: true,
  instagram: true,
  facebook: true,
  linkedin: true,
  lattes: true,
  site: true,
};
const CLOSED_LINKS: PublicationSettings['externalLinks'] = {
  whatsapp: false,
  instagram: false,
  facebook: false,
  linkedin: false,
  lattes: false,
  site: false,
};

/**
 * Regra de visibilidade do conteúdo voluntário da Central — decisão
 * explícita do Administrador (setembro/2026): todo Irmão nasce com o
 * perfil PUBLICADO e todos os blocos/contatos/redes ABERTOS por padrão,
 * mesmo quem nunca teve acesso ao Portal — "fica melhor, porque senão fica
 * muito vazio os perfis". Quem quiser esconder algo especificamente entra
 * e desliga (`UpdatePublicationSettingsUseCase`), gerando o registro de
 * consentimento normalmente.
 *
 * - `settings === null` (nunca configurou nada) → tudo ABERTO.
 * - `settings.suspendedAt !== null` (moderação administrativa) → tudo
 *   FECHADO, sempre — suspensão nunca é sobrescrita por este padrão.
 * - `settings.profilePublished === false` (o próprio Irmão desligou
 *   explicitamente) → tudo FECHADO — a escolha dele é respeitada.
 * - Do contrário → exatamente o que `settings.blocks`/`contacts`/
 *   `externalLinks` diz (pode ser um subconjunto, se ele desligou só
 *   alguns blocos).
 */
export function resolveEffectivePublication(
  settings: PublicationSettings | null,
): EffectivePublication {
  if (settings === null) {
    return { open: true, blocks: OPEN_BLOCKS, contacts: OPEN_CONTACTS, externalLinks: OPEN_LINKS };
  }
  const open = settings.profilePublished && settings.suspendedAt === null;
  if (!open) {
    return { open: false, blocks: CLOSED_BLOCKS, contacts: CLOSED_CONTACTS, externalLinks: CLOSED_LINKS };
  }
  return {
    open: true,
    blocks: settings.blocks,
    contacts: settings.contacts,
    externalLinks: settings.externalLinks,
  };
}
