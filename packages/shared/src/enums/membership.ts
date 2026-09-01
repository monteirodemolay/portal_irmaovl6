export const MEMBER_DEGREES = ['aprendiz', 'companheiro', 'mestre'] as const;
export type MemberDegree = (typeof MEMBER_DEGREES)[number];

/**
 * Situação Maçônica atual do Irmão — substitui o enum plano anterior
 * (`regular`/`irregular`/`remido`/`inativo`/`falecido`/`transferido`, que
 * misturava situação institucional com status financeiro). Cada valor tem
 * seu próprio conjunto de motivos/modalidades em `MEMBER_SITUATION_REASONS`
 * — a fonte de verdade real do "porquê" é o histórico
 * (`MemberSituationRecord`), este campo em `Member` é sempre um espelho do
 * registro vigente, nunca editado diretamente.
 */
export const MEMBER_SITUATION_STATUSES = [
  'ativo',
  'licenciado',
  'suspenso',
  'desligado',
  'falecido',
] as const;
export type MemberSituationStatus = (typeof MEMBER_SITUATION_STATUSES)[number];

export const MEMBER_SITUATION_STATUS_LABELS: Record<MemberSituationStatus, string> = {
  ativo: 'Ativo',
  licenciado: 'Licenciado',
  suspenso: 'Suspenso',
  desligado: 'Desligado',
  falecido: 'Falecido',
};

/** Situações que encerram automaticamente o cargo ativo do Irmão — docs/architecture/06 §6.1. */
export const TERMINAL_MEMBER_SITUATION_STATUSES: MemberSituationStatus[] = [
  'desligado',
  'falecido',
];

/**
 * Motivo/modalidade por situação — toda situação aceita `outro` (exige
 * descrição complementar em `motivoOutroDescricao`). Lista fechada em
 * código de propósito (evita degradar a integridade do histórico com texto
 * livre por padrão), mas isolada aqui pra ficar fácil de ajustar conforme a
 * nomenclatura oficial da GLEG mudar — nunca duplique esta lista em outro
 * arquivo, importe daqui.
 */
export const MEMBER_SITUATION_REASONS = {
  ativo: [
    'iniciacao',
    'filiacao',
    'regularizacao',
    'retorno_licenca',
    'retorno_suspensao',
    'reintegracao',
    'outro',
  ],
  licenciado: ['licenca_pessoal', 'licenca_saude', 'licenca_temporaria', 'outro'],
  suspenso: ['suspensao_administrativa', 'suspensao_disciplinar', 'cobertura_direitos', 'outro'],
  desligado: [
    'quite_placet',
    'placet_ex_officio',
    'exclusao',
    'eliminacao',
    'transferencia_outra_loja',
    'desfiliacao',
    'outro',
  ],
  falecido: ['passou_ao_oriente_eterno'],
} as const satisfies Record<MemberSituationStatus, readonly string[]>;

export type MemberSituationReasonKey =
  (typeof MEMBER_SITUATION_REASONS)[MemberSituationStatus][number];

/** Motivos que, dentro de uma situação `ativo`, representam volta de um Irmão desligado — usados por "Registrar retorno". */
export const MEMBER_RETURN_REASONS = [
  'filiacao',
  'regularizacao',
  'reintegracao',
  'outro',
] as const;
export type MemberReturnReason = (typeof MEMBER_RETURN_REASONS)[number];

export const MEMBER_SITUATION_REASON_LABELS: Record<MemberSituationReasonKey, string> = {
  iniciacao: 'Iniciação',
  filiacao: 'Filiação',
  regularizacao: 'Regularização',
  retorno_licenca: 'Retorno de licença',
  retorno_suspensao: 'Retorno de suspensão',
  reintegracao: 'Reintegração',
  licenca_pessoal: 'Licença pessoal',
  licenca_saude: 'Licença por saúde',
  licenca_temporaria: 'Licença temporária',
  suspensao_administrativa: 'Suspensão administrativa',
  suspensao_disciplinar: 'Suspensão disciplinar',
  cobertura_direitos: 'Cobertura de direitos',
  quite_placet: 'Quite-Placet',
  placet_ex_officio: 'Placet ex officio',
  exclusao: 'Exclusão',
  eliminacao: 'Eliminação',
  transferencia_outra_loja: 'Transferência para outra Loja',
  desfiliacao: 'Desfiliação',
  passou_ao_oriente_eterno: 'Passou ao Oriente Eterno',
  outro: 'Outro',
};

/**
 * Origem de um `MemberSituationRecord` — de onde a informação chegou.
 * `null` (não incluso aqui, ver o campo na entidade) representa todo
 * registro lançado localmente antes desta distinção existir, e continua
 * representando isso: lançamento local pela Loja, sem proveniência
 * explícita da GLEG. Nunca inferido automaticamente — sempre escolhido
 * explicitamente por quem lança o registro.
 */
export const MEMBER_STATUS_RECORD_ORIGINS = [
  'gleg_import',
  'gleg_document',
  'lodge_entry',
  'historical_migration',
] as const;
export type MemberStatusRecordOrigin = (typeof MEMBER_STATUS_RECORD_ORIGINS)[number];

export const MEMBER_STATUS_RECORD_ORIGIN_LABELS: Record<MemberStatusRecordOrigin, string> = {
  gleg_import: 'Importação de arquivo da GLEG',
  gleg_document: 'Documento da GLEG (Quite-Placet, Placet ex officio etc.)',
  lodge_entry: 'Lançamento pela própria Loja',
  historical_migration: 'Migração de histórico anterior',
};

/**
 * Natureza do ato/ocorrência que originou o registro — metadado
 * independente de `situacao`: um Quite-Placet (`recordKind: 'quite_placet'`)
 * ainda exige que o Administrador escolha a `situacao` resultante
 * (normalmente `desligado`), nunca a substitui nem a deriva automaticamente.
 */
export const MEMBER_STATUS_RECORD_KINDS = [
  'situacao',
  'quite_placet',
  'placet_ex_officio',
  'outro',
] as const;
export type MemberStatusRecordKind = (typeof MEMBER_STATUS_RECORD_KINDS)[number];

export const MEMBER_STATUS_RECORD_KIND_LABELS: Record<MemberStatusRecordKind, string> = {
  situacao: 'Situação',
  quite_placet: 'Quite-Placet',
  placet_ex_officio: 'Placet ex officio',
  outro: 'Outro',
};

export const MARITAL_STATUSES = [
  'solteiro',
  'casado',
  'uniao_estavel',
  'separado_judicialmente',
  'divorciado',
  'viuvo',
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

/** Estados civis em que faz sentido registrar dados da cônjuge — docs/architecture/06. */
export const MARITAL_STATUSES_WITH_SPOUSE: MaritalStatus[] = [
  'casado',
  'uniao_estavel',
  'separado_judicialmente',
];
