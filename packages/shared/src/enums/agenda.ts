export const EVENT_KINDS = [
  'sessao',
  'evento',
  'curso',
  'palestra',
  'confraternizacao',
  'aniversario',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  sessao: 'Sessão',
  evento: 'Evento',
  curso: 'Curso',
  palestra: 'Palestra',
  confraternizacao: 'Confraternização',
  aniversario: 'Aniversário',
};

export const EVENT_ATTENDANCE_STATUSES = ['confirmado', 'recusado', 'pendente'] as const;
export type EventAttendanceStatus = (typeof EVENT_ATTENDANCE_STATUSES)[number];

// Grau da Sessão — só tem sentido pra `tipo: 'sessao'`, opcional (`null`)
// pros demais tipos e pra sessões legadas sem essa informação. Usado pela
// Central de Comunicação (docs/architecture) pra preencher automaticamente
// o campo "Grau" do gerador de arte a partir do Evento, sem redigitação —
// nunca redefine `MemberDegree` (que é o grau do Irmão, não da Sessão).
export const SESSION_DEGREES = ['aprendiz', 'companheiro', 'mestre', 'magna', 'publica'] as const;
export type SessionDegree = (typeof SESSION_DEGREES)[number];

export const SESSION_DEGREE_LABELS: Record<SessionDegree, string> = {
  aprendiz: 'Grau Aprendiz',
  companheiro: 'Grau Companheiro',
  mestre: 'Grau Mestre',
  magna: 'Sessão Magna',
  publica: 'Sessão Pública',
};

/**
 * Classificação estruturada da Sessão maçônica — substitui o uso de
 * `SessionDegree`/`grau` pra distinguir Tipo/Natureza/Acesso, que misturava
 * níveis diferentes no mesmo enum ("magna" e "publica" não são graus). Ver
 * `Event.sessionType`/`sessionNature`/`degreeWork`/`access` e
 * `formatSessionName` (packages/shared/src/lib/format-session-name.ts).
 *
 * Nível principal — sempre obrigatório numa Sessão nova; `null` pra Eventos
 * que não são Sessão (`tipo !== 'sessao'`).
 */
export const SESSION_TYPES = ['ordinaria', 'extraordinaria', 'magna'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  ordinaria: 'Ordinária',
  extraordinaria: 'Extraordinária',
  magna: 'Magna',
};

/**
 * Natureza/modalidade — lista depende do `SessionType` escolhido
 * (`SESSION_NATURES_BY_TYPE`). Chave livre (não um union fechado) de
 * propósito: `outra` e futuras modalidades adicionadas pelo Administrador
 * não exigem alterar este arquivo pra cada uma (item 20 do pedido —
 * "configuração administrável", nunca lista rígida espalhada pelo
 * frontend). `SESSION_NATURE_LABELS` cobre as chaves conhecidas; uma chave
 * ausente cai no próprio valor cru na UI (mesmo padrão de
 * `MEMBER_SITUATION_REASON_LABELS`/`reasonLabel`).
 */
export const SESSION_NATURES_BY_TYPE: Record<SessionType, readonly string[]> = {
  ordinaria: [
    'regular',
    'administrativa',
    'instrucao',
    'financas',
    'eleicao',
    'ritualistica',
    'outra',
  ],
  extraordinaria: [
    'administrativa',
    'instrucao',
    'eleicao',
    'ritualistica',
    'assunto_especifico',
    'urgencia',
    'conjunta',
    'outra',
  ],
  magna: [
    'iniciacao',
    'elevacao',
    'exaltacao',
    'posse_administracao',
    'instalacao',
    'regularizacao_loja',
    'reerguimento_loja',
    'inauguracao_templo',
    'sagracao_templo',
    'adocao_lowton',
    'reconhecimento_conjugal',
    'pompas_funebres',
    'conferencia',
    'palestra',
    'festiva',
    'civico_cultural',
    'comemorativa',
    'outra',
  ],
};

export const SESSION_NATURE_LABELS: Record<string, string> = {
  regular: 'Regular',
  administrativa: 'Administrativa',
  instrucao: 'Instrução',
  financas: 'Finanças',
  eleicao: 'Eleição',
  ritualistica: 'Ritualística',
  assunto_especifico: 'Assunto Específico',
  urgencia: 'Urgência',
  conjunta: 'Conjunta',
  iniciacao: 'Iniciação',
  elevacao: 'Elevação',
  exaltacao: 'Exaltação',
  posse_administracao: 'Posse da Administração',
  instalacao: 'Instalação',
  regularizacao_loja: 'Regularização de Loja',
  reerguimento_loja: 'Reerguimento de Loja',
  inauguracao_templo: 'Inauguração de Templo',
  sagracao_templo: 'Sagração de Templo',
  adocao_lowton: 'Adoção de Lowton',
  reconhecimento_conjugal: 'Reconhecimento/Consagração Conjugal',
  pompas_funebres: 'Pompas Fúnebres',
  conferencia: 'Conferência',
  palestra: 'Palestra',
  festiva: 'Festiva',
  civico_cultural: 'Cívico-cultural',
  comemorativa: 'Comemorativa',
  outra: 'Outra',
};

/**
 * Grau dos trabalhos — campo próprio, nunca mais junto de Tipo/Acesso.
 * Preenchido automaticamente a partir da Natureza quando ela já implica um
 * grau certo (Iniciação → Aprendiz, Elevação → Companheiro, Exaltação →
 * Mestre — `inferDegreeWorkFromNature`), sempre ajustável pelo
 * Administrador.
 */
export const SESSION_WORK_DEGREES = [
  'aprendiz',
  'companheiro',
  'mestre',
  'nao_se_aplica',
  'a_definir',
] as const;
export type SessionWorkDegree = (typeof SESSION_WORK_DEGREES)[number];

export const SESSION_WORK_DEGREE_LABELS: Record<SessionWorkDegree, string> = {
  aprendiz: 'Grau 1 — Aprendiz Maçom',
  companheiro: 'Grau 2 — Companheiro Maçom',
  mestre: 'Grau 3 — Mestre Maçom',
  nao_se_aplica: 'Não se aplica',
  a_definir: 'A definir',
};

/** Quem pode entrar na Sessão — nunca mais tratado como Tipo (ver comentário de `SESSION_TYPES`). */
export const SESSION_ACCESS_KINDS = [
  'privativa_macons',
  'publica',
  'admite_convidados',
  'restrita_grau',
  'a_definir',
] as const;
export type SessionAccessKind = (typeof SESSION_ACCESS_KINDS)[number];

export const SESSION_ACCESS_LABELS: Record<SessionAccessKind, string> = {
  privativa_macons: 'Privativa de Maçons',
  publica: 'Pública',
  admite_convidados: 'Admite convidados',
  restrita_grau: 'Restrita a determinados Graus',
  a_definir: 'A definir',
};

/** Uma Loja participante de uma Sessão conjunta — texto livre, nunca referencia outro tenant (Loja externa, fora do Portal). */
export interface JointLodgeReference {
  nome: string;
  numero: string | null;
  oriente: string | null;
  potencia: string | null;
  observacao: string | null;
}

/** A partir da Natureza (só quando ela implica um grau certo) — usado pelo formulário de cadastro pra preencher Grau automaticamente. `null` = sem sugestão, Admin escolhe. */
export function inferDegreeWorkFromNature(nature: string): SessionWorkDegree | null {
  if (nature === 'iniciacao') return 'aprendiz';
  if (nature === 'elevacao') return 'companheiro';
  if (nature === 'exaltacao') return 'mestre';
  return null;
}

/** A partir da Natureza — sugestão de Acesso padrão (sempre ajustável). `null` = sem sugestão. */
export function inferAccessFromNature(nature: string): SessionAccessKind | null {
  if (
    ['iniciacao', 'elevacao', 'exaltacao', 'posse_administracao', 'instalacao'].includes(nature)
  ) {
    return 'privativa_macons';
  }
  if (['festiva', 'civico_cultural', 'comemorativa', 'conferencia', 'palestra'].includes(nature)) {
    return 'publica';
  }
  return null;
}
