import { z } from 'zod';
import { NOTIFICATION_CHANNELS } from '../enums/notification';

export const notificationPreferenceSchema = z.object({
  canaisHabilitados: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1),
});
export type NotificationPreferenceFormValues = z.infer<typeof notificationPreferenceSchema>;

export const linkSchema = z.object({
  titulo: z.string().min(1).max(150),
  url: z.string().url(),
  icone: z.string().max(100).nullable(),
  categoria: z.string().min(1).max(100),
  ordem: z.coerce.number().int().min(0),
});
export type LinkFormValues = z.infer<typeof linkSchema>;
