/**
 * Constelação da Memória (docs/architecture/11-acervo-vl6.md §11.6d) —
 * vocabulário fechado dos tipos de nó que podem participar de uma relação
 * e dos tipos de relação entre eles.
 */
export const ARCHIVE_RELATION_NODE_KINDS = [
  'archiveItem',
  'member',
  'boardTerm',
  'event',
  'archiveCollection',
] as const;
export type ArchiveRelationNodeKind = (typeof ARCHIVE_RELATION_NODE_KINDS)[number];

export const ARCHIVE_RELATION_NODE_KIND_LABELS: Record<ArchiveRelationNodeKind, string> = {
  archiveItem: 'Item do Acervo',
  member: 'Pessoa',
  boardTerm: 'Gestão',
  event: 'Evento',
  archiveCollection: 'Coleção',
};

export const ARCHIVE_RELATION_TYPE_KEYS = [
  'retrata',
  'participou_de',
  'pertence_a',
  'ocorreu_durante',
  'relacionado_a',
] as const;
export type ArchiveRelationTypeKey = (typeof ARCHIVE_RELATION_TYPE_KEYS)[number];

export const ARCHIVE_RELATION_TYPE_LABELS: Record<ArchiveRelationTypeKey, string> = {
  retrata: 'Retrata',
  participou_de: 'Participou de',
  pertence_a: 'Pertence a',
  ocorreu_durante: 'Ocorreu durante',
  relacionado_a: 'Relacionado a',
};
