export const NOTIFICATION_CHANNELS = ['interno', 'email', 'push', 'whatsapp', 'telegram'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// `tipo` já é o vocabulário fechado de origem/categoria da notificação —
// a Central de Avisos (docs/architecture) exibe um rótulo por `tipo` em vez
// de introduzir um campo `category` livre paralelo, que divergiria com o
// tempo. 'acervo' cobre publicações do Acervo VL6.
export const NOTIFICATION_TYPES = [
  'announcement',
  'event',
  'news',
  'file',
  'acervo',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  announcement: 'Comunicado da Gestão',
  event: 'Sessões e Agenda',
  news: 'Notícias',
  file: 'Documentos',
  acervo: 'Acervo VL6',
  system: 'Sistema',
};

export const NOTIFICATION_PRIORITIES = ['normal', 'attention', 'urgent'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  normal: 'Normal',
  attention: 'Atenção',
  urgent: 'Urgente',
};
