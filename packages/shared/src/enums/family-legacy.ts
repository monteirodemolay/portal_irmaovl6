/**
 * Família e Legado VL6 — vocabulário fechado do módulo de parentesco privado
 * (docs internos do pacote de implantação; sem doc de arquitetura numerada
 * ainda — módulo novo, Etapa 1 de 11 do plano). Duas formas canônicas de
 * pessoa: `member` (Irmão cadastrado) e `familyPerson` (familiar externo,
 * histórico ou sem acesso) — nunca se copia nome/biografia entre elas, só se
 * referencia por `{ kind, id }`.
 */
export const FAMILY_PERSON_REF_KINDS = ['member', 'familyPerson'] as const;
export type FamilyPersonRefKind = (typeof FAMILY_PERSON_REF_KINDS)[number];

export const FAMILY_RELATION_KINDS = [
  'parent_of',
  'adoptive_parent_of',
  'spouse_of',
  'partner_of',
  'sibling_of',
  'step_parent_of',
  'guardian_of',
  'declared_kinship',
] as const;
export type FamilyRelationKind = (typeof FAMILY_RELATION_KINDS)[number];

export const FAMILY_RELATION_LABELS: Record<FamilyRelationKind, string> = {
  parent_of: 'Pai ou mãe de',
  adoptive_parent_of: 'Pai ou mãe adotivo(a) de',
  spouse_of: 'Cônjuge de',
  partner_of: 'Companheiro(a) de',
  sibling_of: 'Irmão ou irmã de',
  step_parent_of: 'Padrasto ou madrasta de',
  guardian_of: 'Responsável por',
  declared_kinship: 'Parentesco declarado',
};

export const FAMILY_PARENT_ROLES = ['pai', 'mae', 'responsavel'] as const;
export type FamilyParentRole = (typeof FAMILY_PARENT_ROLES)[number];

export const FAMILY_CHILD_ROLES = ['filho', 'filha', 'descendente'] as const;
export type FamilyChildRole = (typeof FAMILY_CHILD_ROLES)[number];

/**
 * `private`: só responsável e administração; `administration`: administração
 * da Loja; `members`: Irmãos autenticados; `archive`: conteúdo histórico
 * autorizado no Acervo (Memorial — Etapa 9, não construído nesta fase).
 */
export const FAMILY_VISIBILITY_LEVELS = [
  'private',
  'administration',
  'members',
  'archive',
] as const;
export type FamilyVisibilityLevel = (typeof FAMILY_VISIBILITY_LEVELS)[number];

export const FAMILY_VISIBILITY_LABELS: Record<FamilyVisibilityLevel, string> = {
  private: 'Privado (só eu e a administração)',
  administration: 'Administração da Loja',
  members: 'Irmãos autenticados',
  archive: 'Acervo (histórico autorizado)',
};

export const FAMILY_CONFIRMATION_STATUSES = [
  'not_required',
  'pending',
  'confirmed',
  'declined',
] as const;
export type FamilyConfirmationStatus = (typeof FAMILY_CONFIRMATION_STATUSES)[number];

export const FAMILY_CONFIRMATION_STATUS_LABELS: Record<FamilyConfirmationStatus, string> = {
  not_required: 'Não exige confirmação',
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  declined: 'Recusado',
};

export const FAMILY_REVIEW_STATUSES = ['draft', 'pending_review', 'verified', 'rejected'] as const;
export type FamilyReviewStatus = (typeof FAMILY_REVIEW_STATUSES)[number];

export const FAMILY_REVIEW_STATUS_LABELS: Record<FamilyReviewStatus, string> = {
  draft: 'Rascunho',
  pending_review: 'Aguardando revisão',
  verified: 'Verificado',
  rejected: 'Rejeitado',
};

export const FAMILY_SOURCE_KINDS = [
  'self_declaration',
  'family_report',
  'document',
  'archive_record',
  'lodge_record',
  'official_source',
] as const;
export type FamilySourceKind = (typeof FAMILY_SOURCE_KINDS)[number];

export const FAMILY_SOURCE_KIND_LABELS: Record<FamilySourceKind, string> = {
  self_declaration: 'Declaração própria',
  family_report: 'Relato familiar',
  document: 'Documento',
  archive_record: 'Registro do Acervo',
  lodge_record: 'Registro de Loja',
  official_source: 'Fonte oficial',
};

export const PERSON_LIFE_STATUSES = ['living', 'deceased', 'unknown'] as const;
export type PersonLifeStatus = (typeof PERSON_LIFE_STATUSES)[number];

export const PERSON_LIFE_STATUS_LABELS: Record<PersonLifeStatus, string> = {
  living: 'Vivo(a)',
  deceased: 'In Memoriam / Oriente Eterno',
  unknown: 'Não informado',
};

/**
 * Distingue "foi perguntado e a resposta é não" (`none`) de "ainda não se
 * sabe" (`unknown`) — nenhuma afiliação nunca é deduzida por parentesco.
 */
export const PERSON_FRATERNAL_LINK_STATUSES = ['none', 'unknown', 'has_affiliation'] as const;
export type PersonFraternalLinkStatus = (typeof PERSON_FRATERNAL_LINK_STATUSES)[number];

export const PERSON_FRATERNAL_LINK_STATUS_LABELS: Record<PersonFraternalLinkStatus, string> = {
  none: 'Sem vínculo maçônico ou paramaçônico',
  unknown: 'Não sei informar',
  has_affiliation: 'Possui vínculo',
};

export const FRATERNAL_AFFILIATION_KINDS = [
  'mason',
  'demolay',
  'jobs_daughters',
  'eastern_star',
  'rainbow_girls',
  'female_fraternity',
  'lowton',
  'paramasonic_other',
] as const;
export type FraternalAffiliationKind = (typeof FRATERNAL_AFFILIATION_KINDS)[number];

export const FRATERNAL_AFFILIATION_LABELS: Record<FraternalAffiliationKind, string> = {
  mason: 'Maçonaria',
  demolay: 'Ordem DeMolay',
  jobs_daughters: 'Ordem Internacional das Filhas de Jó',
  eastern_star: 'Ordem da Estrela do Oriente',
  rainbow_girls: 'Ordem Internacional do Arco-Íris para Meninas',
  female_fraternity: 'Fraternidade Feminina',
  lowton: 'Lowton',
  paramasonic_other: 'Outra organização maçônica ou paramaçônica',
};

export const FRATERNAL_UNIT_KINDS = [
  'lodge',
  'chapter',
  'bethel',
  'assembly',
  'fraternity',
  'other',
] as const;
export type FraternalUnitKind = (typeof FRATERNAL_UNIT_KINDS)[number];

export const FRATERNAL_UNIT_KIND_LABELS: Record<FraternalUnitKind, string> = {
  lodge: 'Loja',
  chapter: 'Capítulo',
  bethel: 'Bethel',
  assembly: 'Assembleia',
  fraternity: 'Fraternidade',
  other: 'Outra unidade',
};

/**
 * Grupos de exibição do "Meu Espaço" (04_TELAS_E_FLUXOS.md §1) — derivados do
 * parentesco calculado, não persistidos.
 */
export const FAMILY_DISPLAY_GROUPS = [
  'ascendentes',
  'familia_proxima',
  'descendentes',
  'familia_por_afinidade',
  'outros_vinculos',
] as const;
export type FamilyDisplayGroup = (typeof FAMILY_DISPLAY_GROUPS)[number];

export const FAMILY_DISPLAY_GROUP_LABELS: Record<FamilyDisplayGroup, string> = {
  ascendentes: 'Ascendentes',
  familia_proxima: 'Família próxima',
  descendentes: 'Descendentes',
  familia_por_afinidade: 'Família por afinidade',
  outros_vinculos: 'Outros vínculos',
};
