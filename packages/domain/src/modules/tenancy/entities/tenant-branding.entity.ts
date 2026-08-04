import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Identidade visual da Loja — nunca hardcoded em componente algum
 * (docs/architecture/09-design-system.md §9.2). Uma entidade separada de
 * `Tenant` para permitir versionar/reverter branding sem tocar em dados
 * cadastrais.
 */
export interface TenantBranding extends BaseEntity {
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corFundo: string;
  tipografia: string;
  raioBorda: number;
  modoEscuroHabilitado: boolean;
  brasaoUrl: string | null;
  logotipoUrl: string | null;
  faviconUrl: string | null;
}
