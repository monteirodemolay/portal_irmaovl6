export const NOTIFICATION_CHANNELS = ['interno', 'email', 'push', 'whatsapp', 'telegram'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = ['announcement', 'event', 'news', 'file', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
