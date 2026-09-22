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
   * @deprecated Campo legado da foto de fundo da hero de `/irmaos`, de antes
   * do cabeçalho padronizado (`PageHero`) existir. Mantido só como fallback
   * de leitura em `resolveHeroPhoto` pra não perder a foto que a Loja já
   * tinha configurado — nunca mais escrito. Use `heroPhotos['comunidade']`.
   */
  comunidadeHeroFotoUrl: string | null;
  /** @deprecated Ver `comunidadeHeroFotoUrl`. */
  comunidadeHeroFotoPosicao: number | null;
  /**
   * Fotografias de fundo do `PageHero` padronizado, uma por página (chave
   * livre, ex. `'comunidade'`, `'dashboard'`, `'acervo'`) — configuráveis
   * pelo Administrador da Loja (`tenant:manage`), nunca por Irmão comum.
   * Página sem entrada aqui cai no gradiente institucional padrão.
   */
  heroPhotos: Record<string, { url: string; posicao: number }>;
}
