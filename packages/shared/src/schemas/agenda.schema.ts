import { z } from 'zod';
import { EVENT_KINDS } from '../enums/agenda';
import { ACCESS_LEVEL_KEYS } from '../enums/access-level';

export const eventSchema = z
  .object({
    tipo: z.enum(EVENT_KINDS),
    titulo: z.string().min(1).max(200),
    descricao: z.string().max(2000).nullable(),
    local: z.string().min(1).max(200),
    dataInicio: z.coerce.date(),
    dataFim: z.coerce.date().nullable(),
    exigeConfirmacaoPresenca: z.boolean(),
    capacidadeMaxima: z.coerce.number().int().min(1).nullable(),
    traje: z.string().max(200).nullable(),
    chegadaSugerida: z.string().max(200).nullable(),
    observacoes: z.string().max(1000).nullable(),
    arquivosRelacionados: z.array(z.string()).default([]),
    // Fase 1 da Fundação do Acervo VL6 (docs/architecture/11-acervo-vl6.md
    // §11.5) — vínculo forte com Gestão e controle de acesso/linha do
    // tempo. Default seguro para eventos legados: `boardTermId` nulo (será
    // preenchido por `FindBoardTermForDateUseCase` quando aplicável),
    // `nivelAcesso` "irmãos" (visibilidade equivalente à leitura atual, já
    // que todo Irmão tem `event:read`), exibido na linha do tempo por padrão.
    boardTermId: z.string().min(1).nullable().default(null),
    nivelAcesso: z.enum(ACCESS_LEVEL_KEYS).default('irmaos'),
    exibirNaLinhaDoTempo: z.boolean().default(true),
  })
  .refine((data) => !data.dataFim || data.dataFim > data.dataInicio, {
    message: 'A data final deve ser posterior à data inicial.',
    path: ['dataFim'],
  });
export type EventFormValues = z.infer<typeof eventSchema>;
