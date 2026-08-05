import { z } from 'zod';
import { EVENT_KINDS } from '../enums/agenda';

export const eventSchema = z
  .object({
    tipo: z.enum(EVENT_KINDS),
    titulo: z.string().min(1).max(200),
    descricao: z.string().max(2000).nullable(),
    local: z.string().min(1).max(200),
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date(),
    exigeConfirmacaoPresenca: z.boolean(),
    capacidadeMaxima: z.coerce.number().int().min(1).nullable(),
  })
  .refine((data) => data.dataFim > data.dataInicio, {
    message: 'A data final deve ser posterior à data inicial.',
    path: ['dataFim'],
  });
export type EventFormValues = z.infer<typeof eventSchema>;
