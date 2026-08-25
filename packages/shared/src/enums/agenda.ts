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
