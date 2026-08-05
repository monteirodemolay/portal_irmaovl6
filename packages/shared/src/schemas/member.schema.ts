import { z } from 'zod';
import { MEMBER_DEGREES, MEMBER_SITUATIONS } from '../enums/membership';
import { addressSchema } from './tenant.schema';

export const memberSchema = z.object({
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
export type MemberFormValues = z.infer<typeof memberSchema>;

/** Subconjunto editável pelo próprio Irmão no autoatendimento (docs/architecture/08 §8.3). */
export const memberSelfEditSchema = memberSchema.pick({
  nomeMaconico: true,
  fotoUrl: true,
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
