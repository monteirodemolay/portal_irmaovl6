import type { ArchiveRelationNodeKind, ArchiveRelationTypeKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Constelação da Memória (docs/architecture/11-acervo-vl6.md §11.6d) — uma
 * aresta entre dois nós já existentes no domínio, identificados pelo seu ID
 * canônico (`origemId`/`destinoId` — ID composto quando `tipo` for
 * `archiveItem`, ID real de `Member`/`BoardTerm`/`Event`/`ArchiveCollection`
 * nos demais casos). Não copia nem cacheia dado nenhum do nó referenciado.
 */
export interface ArchiveRelation extends BaseEntity {
  origemTipo: ArchiveRelationNodeKind;
  origemId: string;
  destinoTipo: ArchiveRelationNodeKind;
  destinoId: string;
  tipo: ArchiveRelationTypeKey;
  descricao: string | null;
}
