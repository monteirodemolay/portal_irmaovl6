import type { BaseEntity } from '../../../shared/base-entity';

export interface MenuItemConfig {
  label: string;
  href: string;
  icon: string | null;
  ordem: number;
  visivelPara: string[];
}

export interface FooterConfig {
  textoDireitosAutorais: string;
  links: { label: string; href: string }[];
}

/**
 * Configuração comportamental da Loja (idioma, menus, rodapé, textos
 * institucionais, integrações habilitadas) — separada de `TenantBranding`
 * porque muda com outra cadência e por outros papéis.
 */
export interface TenantSettings extends BaseEntity {
  idiomaPadrao: string;
  textosInstitucionais: Record<string, string>;
  itensMenu: MenuItemConfig[];
  rodape: FooterConfig;
  integracoesHabilitadas: string[];
}
