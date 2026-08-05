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
