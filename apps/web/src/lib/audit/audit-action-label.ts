import type { AuditAction } from '@vl6/domain';

/** Rótulo em pt-BR pra cada ação de auditoria — só usado na exibição (nunca na lógica). */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  restore: 'Restauração',
  login: 'Login',
  permission_change: 'Alteração de permissão',
  member_profile_assisted_started: 'Cadastro assistido iniciado',
  member_profile_assisted_updated: 'Cadastro assistido atualizado',
  member_profile_consent_recorded: 'Consentimento de publicação registrado',
  member_profile_blocks_published: 'Blocos do perfil publicados',
  member_profile_consent_revoked: 'Consentimento de publicação revogado',
  legal_document_version_published: 'Versão de documento legal publicada',
};

/** Nome em pt-BR pra cada coleção auditada — chave é o `entidade` gravado em `AuditLog`. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  members: 'Irmão',
  users: 'Usuário',
  roles: 'Papel',
  boardTerms: 'Gestão',
  boardPositionAssignments: 'Cargo da Diretoria',
  committees: 'Comissão',
  news: 'Notícia',
  announcements: 'Aviso',
  inspirationalQuotes: 'Frase',
  artTemplates: 'Modelo de arte',
  publications: 'Publicação',
  memberCentralProfiles: 'Perfil da Central VL6',
  publicationSettings: 'Configuração de publicação',
  archiveCollections: 'Coleção do Acervo',
  constellationViews: 'Constelação',
  archiveRelations: 'Relação do Acervo',
  archiveExhibitions: 'Exposição',
  archiveCatalogEntries: 'Entrada do Catálogo',
  archiveContributions: 'Contribuição do Acervo',
  archiveItems: 'Item do Acervo',
  mediaAssets: 'Mídia',
  archiveMedia: 'Mídia do Acervo',
  familyPersons: 'Familiar',
  familyRelationships: 'Vínculo familiar',
  personFraternalRecords: 'Afiliação paramaçônica',
  memberSituationRecords: 'Situação do Irmão',
  legalDocumentVersions: 'Versão de documento legal',
};
