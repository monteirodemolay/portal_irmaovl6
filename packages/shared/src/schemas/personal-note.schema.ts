import { z } from 'zod';

export const CALENDAR_SOURCES = ['vl6', 'personal', 'google'] as const;

export const personalNoteSchema = z.object({
  texto: z.string().min(1).max(2000),
  eventoOrigem: z.enum(CALENDAR_SOURCES).nullable(),
  eventoId: z.string().nullable(),
});

export type PersonalNoteFormValues = z.infer<typeof personalNoteSchema>;
