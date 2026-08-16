import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Coleção editorial do Acervo VL6 — Etapa 2 da evolução do Acervo (ver
 * docs/architecture/11-acervo-vl6.md §11.6). `itemIds` guarda os IDs
 * compostos de convergência (`file_<id>`, `library_<id>`,
 * `gallery-album_<id>`, `gallery-media_<id>` — ver
 * apps/web/src/modules/archive/lib/archive-item-id.ts) e nunca duplica o
 * registro de origem: o domínio trata cada entrada como string opaca, sem
 * conhecer o formato — quem interpreta é a camada de apresentação.
 */
export interface ArchiveCollection extends BaseEntity {
  titulo: string;
  slug: string;
  descricaoEditorial: string | null;
  curadoPor: string | null;
  capaUrl: string | null;
  itemIds: string[];
  publicado: boolean;
  ordem: number;
}
