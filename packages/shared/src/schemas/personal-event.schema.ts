import { z } from 'zod';

export const personalEventSchema = z
  .object({
    titulo: z.string().min(1).max(200),
    descricao: z.string().max(2000).nullable(),
    local: z.string().max(200).nullable(),
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date(),
    lembreteMinutosAntes: z.coerce.number().int().min(0).nullable(),
    sincronizarComGoogle: z.boolean(),
  })
  .refine((data) => data.dataFim > data.dataInicio, {
    message: 'A data final deve ser posterior à data inicial.',
    path: ['dataFim'],
  });

export type PersonalEventFormValues = z.infer<typeof personalEventSchema>;
