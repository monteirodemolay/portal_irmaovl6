import { z } from 'zod';
import {
  MARITAL_STATUSES,
  MARITAL_STATUSES_WITH_SPOUSE,
  MEMBER_DEGREES,
  MEMBER_SITUATIONS,
  type MaritalStatus,
} from '../enums/membership';
import { addressSchema } from './tenant.schema';

const memberBaseSchema = z.object({
  nomeCompleto: z.string().min(3).max(150),
  nomeMaconico: z.string().max(150).nullable(),
  fotoUrl: z.string().url().nullable(),
  email: z.string().email(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  endereco: addressSchema.nullable(),
  dataNascimento: z.coerce.date().nullable(),
  dataIniciacao: z.coerce.date().nullable(),
  dataElevacao: z.coerce.date().nullable(),
  dataExaltacao: z.coerce.date().nullable(),
  cim: z.string().nullable(),
  matricula: z.string().nullable(),
  grau: z.enum(MEMBER_DEGREES),
  situacao: z.enum(MEMBER_SITUATIONS),
  lojaId: z.string().min(1),
  potencia: z.string().min(1),
  profissao: z.string().nullable(),
  empresa: z.string().nullable(),
  estadoCivil: z.enum(MARITAL_STATUSES).nullable(),
  /** Só faz sentido quando `estadoCivil` implica cônjuge — normalizado por `normalizeConjugeFields`. */
  conjugeNome: z.string().nullable(),
  conjugeDataNascimento: z.coerce.date().nullable(),
  biografia: z.string().max(4000).nullable(),
  redesSociais: z.object({
    instagram: z.string().url().nullable().optional(),
    facebook: z.string().url().nullable().optional(),
    linkedin: z.string().url().nullable().optional(),
  }),
  observacoes: z.string().max(4000).nullable(),
});

/**
 * Cadastro simplificado: só nome e e-mail são obrigatórios (`memberBaseSchema`
 * — `.min(3)`/`.email()`), todo o resto é opcional, incluindo matrícula e as
 * datas maçônicas. A única coerência que continua sendo validada é
 * cronológica — quando as datas são informadas, não podem estar fora de
 * ordem (elevação não pode anteceder iniciação, exaltação não pode
 * anteceder elevação).
 */
export const memberSchema = memberBaseSchema.superRefine((data, ctx) => {
  if (data.dataIniciacao && data.dataElevacao && data.dataElevacao < data.dataIniciacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataElevacao'],
      message: 'Data de Elevação não pode ser anterior à Data de Iniciação.',
    });
  }
  if (data.dataElevacao && data.dataExaltacao && data.dataExaltacao < data.dataElevacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataExaltacao'],
      message: 'Data de Exaltação não pode ser anterior à Data de Elevação.',
    });
  }
});
export type MemberFormValues = z.infer<typeof memberBaseSchema>;

/**
 * Zera os dados da cônjuge quando o estado civil não implica cônjuge — evita
 * que um valor antigo (ex.: Irmão era casado e mudou pra divorciado) fique
 * órfão no cadastro. Chamada explicitamente pelas Server Actions depois do
 * parse, tanto no cadastro administrativo quanto no autoatendimento — os
 * dois schemas (`memberSchema`/`memberSelfEditSchema`) picam campos
 * diferentes de `memberBaseSchema`, então não dá pra centralizar isso num
 * único `.transform()` de schema.
 */
export function normalizeConjugeFields<
  T extends {
    estadoCivil: MaritalStatus | null;
    conjugeNome: string | null;
    conjugeDataNascimento: Date | null;
  },
>(input: T): T {
  if (input.estadoCivil && MARITAL_STATUSES_WITH_SPOUSE.includes(input.estadoCivil)) {
    return input;
  }
  return { ...input, conjugeNome: null, conjugeDataNascimento: null };
}

/**
 * Subconjunto editável pelo próprio Irmão no autoatendimento (docs/architecture/08 §8.3).
 * `fotoUrl` fica de fora de propósito: na 1ª fase da foto do Irmão, só o
 * Administrador cadastra/altera (docs/architecture/06 — "Acesso ao Portal");
 * mantê-la fora do schema garante que `{ ...current, ...input }` em
 * `UpdateMyProfileUseCase` nunca sobrescreva a foto já cadastrada.
 */
export const memberSelfEditSchema = memberBaseSchema.pick({
  nomeMaconico: true,
  telefone: true,
  whatsapp: true,
  endereco: true,
  profissao: true,
  empresa: true,
  estadoCivil: true,
  conjugeNome: true,
  conjugeDataNascimento: true,
  biografia: true,
  redesSociais: true,
});
export type MemberSelfEditValues = z.infer<typeof memberSelfEditSchema>;
