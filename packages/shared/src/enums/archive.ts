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

/**
 * Contribuições dos Irmãos (docs/architecture/11-acervo-vl6.md §11.6g) —
 * envio livre de documento/foto/relato por qualquer Irmão, em quarentena
 * até um Administrador aprovar ou rejeitar. Aprovar não promove
 * automaticamente para `FileAsset`/`GalleryMedia` — o Administrador decide
 * separadamente se e como incorporar ao Acervo formal, usando os fluxos já
 * existentes.
 */
export const ARCHIVE_CONTRIBUTION_TYPE_KEYS = ['documento', 'fotografia', 'memoria'] as const;
export type ArchiveContributionTypeKey = (typeof ARCHIVE_CONTRIBUTION_TYPE_KEYS)[number];

export const ARCHIVE_CONTRIBUTION_TYPE_LABELS: Record<ArchiveContributionTypeKey, string> = {
  documento: 'Documento',
  fotografia: 'Foto ou vídeo',
  memoria: 'Relato ou memória (sem arquivo)',
};

export const ARCHIVE_CONTRIBUTION_STATUS_KEYS = ['pendente', 'aprovada', 'rejeitada'] as const;
export type ArchiveContributionStatus = (typeof ARCHIVE_CONTRIBUTION_STATUS_KEYS)[number];

export const ARCHIVE_CONTRIBUTION_STATUS_LABELS: Record<ArchiveContributionStatus, string> = {
  pendente: 'Em análise',
  aprovada: 'Aprovada',
  rejeitada: 'Não aprovada',
};

/**
 * `ArchiveItem` — Fase 1 da Fundação do Acervo VL6 (docs/architecture/
 * 11-acervo-vl6.md §11.5, `archiveItems`). `publicacaoStatus` é o ciclo de
 * vida editorial do item, distinto de `status`/`ativo` herdados de
 * `BaseEntity` (que seguem soft delete) — mesmo padrão de
 * `ArchiveContribution.moderacaoStatus` acima.
 */
export const ARCHIVE_ITEM_STATUS_KEYS = [
  'rascunho',
  'pronto_para_publicar',
  'publicado',
  'oculto',
  'arquivado',
] as const;
export type ArchiveItemStatus = (typeof ARCHIVE_ITEM_STATUS_KEYS)[number];

export const ARCHIVE_ITEM_STATUS_LABELS: Record<ArchiveItemStatus, string> = {
  rascunho: 'Rascunho',
  pronto_para_publicar: 'Pronto para publicar',
  publicado: 'Publicado',
  oculto: 'Oculto',
  arquivado: 'Arquivado',
};

/** Classificação editorial do item — mais ampla que o tipo técnico da mídia (`ArchiveMediaTypeKey`, packages/shared/src/enums/media-asset.ts). */
export const ARCHIVE_ITEM_TYPE_KEYS = [
  'fotografia',
  'documento',
  'audiovisual',
  'objeto',
  'outro',
] as const;
export type ArchiveItemTypeKey = (typeof ARCHIVE_ITEM_TYPE_KEYS)[number];

export const ARCHIVE_ITEM_TYPE_LABELS: Record<ArchiveItemTypeKey, string> = {
  fotografia: 'Fotografia',
  documento: 'Documento',
  audiovisual: 'Audiovisual',
  objeto: 'Objeto',
  outro: 'Outro',
};
