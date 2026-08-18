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
 * Cadência de troca da "frase do dia" no Início — `recarga` sorteia uma
 * frase a cada carregamento da página, `diaria` mantém a mesma frase pra
 * todo mundo no mesmo dia (fuso da Loja), `intervalo` troca a cada
 * `intervaloMinutos` (usado só nesse modo, `null` nos demais).
 */
export interface QuoteRotationSettings {
  modo: 'recarga' | 'diaria' | 'intervalo';
  intervaloMinutos: number | null;
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
  citacaoRotacao: QuoteRotationSettings;
}
