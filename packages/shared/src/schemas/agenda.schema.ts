import { z } from 'zod';
import {
  EVENT_KINDS,
  SESSION_ACCESS_KINDS,
  SESSION_DEGREES,
  SESSION_TYPES,
  SESSION_WORK_DEGREES,
} from '../enums/agenda';
import { ACCESS_LEVEL_KEYS } from '../enums/access-level';

const jointLodgeReferenceSchema = z.object({
  nome: z.string().min(1).max(200),
  numero: z.string().max(30).nullable(),
  oriente: z.string().max(120).nullable(),
  potencia: z.string().max(60).nullable(),
  observacao: z.string().max(500).nullable(),
});

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
    /** @deprecated ver `Event.grau` — mantido só por compatibilidade com dados já gravados. */
    grau: z.enum(SESSION_DEGREES).nullable().default(null),
    // Classificação estruturada da Sessão — todos opcionais no schema
    // (`tipo !== 'sessao'` nunca os preenche), mas obrigatórios em conjunto
    // quando `tipo === 'sessao'` (regra abaixo, `.refine`) — ver
    // comentário de `SESSION_TYPES` em packages/shared/src/enums/agenda.ts.
    sessionType: z.enum(SESSION_TYPES).nullable().default(null),
    sessionNature: z.string().max(60).nullable().default(null),
    degreeWork: z.enum(SESSION_WORK_DEGREES).nullable().default(null),
    access: z.enum(SESSION_ACCESS_KINDS).nullable().default(null),
    isJointSession: z.boolean().default(false),
    participatingLodges: z.array(jointLodgeReferenceSchema).default([]),
  })
  .refine((data) => !data.dataFim || data.dataFim > data.dataInicio, {
    message: 'A data final deve ser posterior à data inicial.',
    path: ['dataFim'],
  })
  .refine((data) => data.tipo !== 'sessao' || data.sessionType !== null, {
    message: 'Selecione o Tipo da Sessão.',
    path: ['sessionType'],
  });
export type EventFormValues = z.infer<typeof eventSchema>;
