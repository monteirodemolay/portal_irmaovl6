import type { BaseEntity } from '../../../shared/base-entity';
import type { Address } from '../../../shared/address';

export type { Address };

/**
 * Representa uma Loja instalada na plataforma. `id === tenantId` sempre —
 * ver docs/architecture/03-modelo-dados.md.
 */
export interface Tenant extends BaseEntity {
  nome: string;
  numero: string;
  potencia: string;
  dominio: string | null;
  subdominio: string;
  endereco: Address | null;
  telefone: string | null;
  whatsapp: string | null;
  site: string | null;
  email: string;
  modulosHabilitados: string[];
  /**
   * Fotografia de fundo da hero da Comunidade VL6 (`/irmaos`) — configurável
   * pelo Administrador da Loja (`tenant:manage`), nunca por Irmão comum.
   * `null` enquanto nenhuma foto foi enviada (hero cai no gradiente padrão).
   */
  comunidadeHeroFotoUrl: string | null;
  /**
   * Enquadramento vertical da foto acima, 0–100 (equivalente a
   * `object-position: center Y%`). `null` junto com `comunidadeHeroFotoUrl`
   * nulo, ou quando a foto foi enviada sem ajuste (usa o centro, 50).
   */
  comunidadeHeroFotoPosicao: number | null;
}
