import { z } from 'zod';
import { NOTIFICATION_CHANNELS } from '../enums/notification';
import { LINK_ACCESS_TYPE_KEYS, LINK_CATEGORY_KEYS } from '../enums/links';

export const notificationPreferenceSchema = z.object({
  canaisHabilitados: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1),
});
export type NotificationPreferenceFormValues = z.infer<typeof notificationPreferenceSchema>;

export const linkSchema = z.object({
  titulo: z.string().min(1).max(150),
  url: z.string().url(),
  descricao: z.string().max(300).nullable(),
  icone: z.string().max(100).nullable(),
  categoria: z.enum(LINK_CATEGORY_KEYS),
  tipoAcesso: z.enum(LINK_ACCESS_TYPE_KEYS),
  destaque: z.boolean(),
  ordem: z.coerce.number().int().min(0),
});
export type LinkFormValues = z.infer<typeof linkSchema>;

/** "Sugerir um link" — Área do Irmão, sem os campos internos de curadoria (categoria/tipoAcesso/destaque). */
export const linkSuggestionSchema = z.object({
  titulo: z.string().min(1).max(150),
  url: z.string().url(),
  descricao: z.string().max(500).nullable(),
});
export type LinkSuggestionFormValues = z.infer<typeof linkSuggestionSchema>;
