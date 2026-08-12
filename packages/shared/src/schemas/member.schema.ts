import { z } from 'zod';
import { MEMBER_DEGREES, MEMBER_SITUATIONS } from '../enums/membership';
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
  matricula: z.string().min(1),
  grau: z.enum(MEMBER_DEGREES),
  situacao: z.enum(MEMBER_SITUATIONS),
  lojaId: z.string().min(1),
  potencia: z.string().min(1),
  profissao: z.string().nullable(),
  empresa: z.string().nullable(),
  estadoCivil: z.string().nullable(),
  biografia: z.string().max(4000).nullable(),
  redesSociais: z.object({
    instagram: z.string().url().nullable().optional(),
    facebook: z.string().url().nullable().optional(),
    linkedin: z.string().url().nullable().optional(),
  }),
  observacoes: z.string().max(4000).nullable(),
});

/**
 * Coerência entre grau e datas maçônicas (docs/architecture/06-regras-negocio.md
 * §6.1): cada grau exige as datas dos graus anteriores (aprendiz → iniciação;
 * companheiro → + elevação; mestre → + exaltação) e a ordem cronológica entre
 * elas nunca pode ser invertida. Bloqueante desde já — produção não tem
 * nenhum Irmão cadastrado ainda, sem dado legado para quebrar.
 */
export const memberSchema = memberBaseSchema.superRefine((data, ctx) => {
  if (!data.dataIniciacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataIniciacao'],
      message: 'Data de Iniciação é obrigatória.',
    });
  }
  if ((data.grau === 'companheiro' || data.grau === 'mestre') && !data.dataElevacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataElevacao'],
      message: 'Data de Elevação é obrigatória a partir do grau de Companheiro.',
    });
  }
  if (data.grau === 'mestre' && !data.dataExaltacao) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dataExaltacao'],
      message: 'Data de Exaltação é obrigatória no grau de Mestre.',
    });
  }
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
  biografia: true,
  redesSociais: true,
});
export type MemberSelfEditValues = z.infer<typeof memberSelfEditSchema>;
