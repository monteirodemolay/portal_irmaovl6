import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Catalogação formal (docs/architecture/11-acervo-vl6.md §11.6e) — camada
 * aditiva de descrição intelectual e contexto histórico sobre um item já
 * existente, referenciado por `origemId` (o ID composto do Estágio 1:
 * `tipo_idDeOrigem`). Nunca copia nem substitui o registro de origem — só
 * complementa. 1:1 por `origemId` dentro do tenant.
 */
export interface ArchiveCatalogEntry extends BaseEntity {
  origemId: string;
  tituloCurado: string | null;
  contextoHistorico: string | null;
  tags: string[];
  publicado: boolean;
}
