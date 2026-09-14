import { z } from 'zod';
import {
  MARITAL_STATUSES,
  MARITAL_STATUSES_WITH_SPOUSE,
  MEMBER_DEGREES,
  MEMBER_SITUATION_STATUSES,
  type MaritalStatus,
} from '../enums/membership';
import { addressSchema } from './tenant.schema';

const memberChildSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1).max(150),
  aniversarioDia: z.number().int().min(1).max(31),
  aniversarioMes: z.number().int().min(1).max(12),
});
export type MemberChildValues = z.infer<typeof memberChildSchema>;

const memberBaseSchema = z.object({
  nomeCompleto: z.string().min(3).max(150),
  fotoUrl: z.string().url().nullable(),
  /** Opcional — Irmãos importados em massa podem não ter e-mail ainda (ver `ClaimMemberAccountUseCase`). */
  email: z.string().email().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  endereco: addressSchema.nullable(),
  dataNascimento: z.coerce.date().nullable(),
  /** Fallback quando não se sabe o ano do próprio aniversário do Irmão — só usado (`ListUpcomingAnniversariesUseCase`) quando `dataNascimento` é null. Opcional — cadastros existentes não precisam ganhar esse campo. */
  aniversarioDia: z.number().int().min(1).max(31).nullable().optional(),
  aniversarioMes: z.number().int().min(1).max(12).nullable().optional(),
  dataIniciacao: z.coerce.date().nullable(),
  dataElevacao: z.coerce.date().nullable(),
  dataExaltacao: z.coerce.date().nullable(),
  /** Identificador único do Irmão na Loja — mesmo valor antes espalhado entre "matrícula" e "CIM". */
  cim: z.string().nullable(),
  grau: z.enum(MEMBER_DEGREES),
  /** Espelho do registro vigente em `MemberSituationRecord` — nunca editável direto por este schema/formulário; ver `RegisterMemberSituationUseCase`. */
  situacao: z.enum(MEMBER_SITUATION_STATUSES),
  lojaId: z.string().min(1),
  potencia: z.string().min(1),
  profissao: z.string().nullable(),
  empresa: z.string().nullable(),
  estadoCivil: z.enum(MARITAL_STATUSES).nullable(),
  /** Só faz sentido quando `estadoCivil` implica cônjuge — normalizado por `normalizeConjugeFields`. */
  conjugeNome: z.string().nullable(),
  conjugeDataNascimento: z.coerce.date().nullable(),
  /** Fallback quando não se sabe o ano de nascimento da cônjuge — só usado (`ListUpcomingAnniversariesUseCase`) quando `conjugeDataNascimento` é null. */
  conjugeAniversarioDia: z.number().int().min(1).max(31).nullable(),
  conjugeAniversarioMes: z.number().int().min(1).max(12).nullable(),
  /** Data completa do casamento, quando conhecida — uso interno da Secretaria, nunca aparece no Diretório. Opcional, mesmo motivo de `aniversarioDia`. */
  dataCasamento: z.coerce.date().nullable().optional(),
  /** Filhos do Irmão — só dia/mês de aniversário, nunca o ano (mesmo motivo do fallback da cônjuge). */
  filhos: z.array(memberChildSchema),
  biografia: z.string().max(4000).nullable(),
  redesSociais: z.object({
    instagram: z.string().url().nullable().optional(),
    facebook: z.string().url().nullable().optional(),
    linkedin: z.string().url().nullable().optional(),
  }),
  observacoes: z.string().max(4000).nullable(),
  // Consentimento específico pra publicação EXTERNA (Instagram/WhatsApp) via
  // Central de Comunicação (docs/architecture) — distinto da publicação
  // voluntária no Diretório interno (`PublicationSettings.profilePublished`,
  // módulo `central`). Opt-in, nunca opt-out: default `false`.
  autorizaDivulgacaoExterna: z.boolean().default(false),
});

/**
 * Cadastro simplificado: só nome e e-mail são obrigatórios (`memberBaseSchema`
 * — `.min(3)`/`.email()`), todo o resto é opcional, incluindo CIM e as datas
 * maçônicas. A única coerência que continua sendo validada é cronológica —
 * quando as datas são informadas, não podem estar fora de ordem (elevação
 * não pode anteceder iniciação, exaltação não pode anteceder elevação).
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
    conjugeAniversarioDia: number | null;
    conjugeAniversarioMes: number | null;
    dataCasamento?: Date | null;
  },
>(input: T): T {
  if (input.estadoCivil && MARITAL_STATUSES_WITH_SPOUSE.includes(input.estadoCivil)) {
    return input;
  }
  return {
    ...input,
    conjugeNome: null,
    conjugeDataNascimento: null,
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    dataCasamento: null,
  };
}

/**
 * Subconjunto editável pelo próprio Irmão no autoatendimento (docs/architecture/08 §8.3)
 * — exatamente os campos que os cartões compartilhados de
 * `profile-fields/` (também usados pelo Admin) editam. `biografia` e
 * `redesSociais` ficam de fora de propósito: nenhuma tela de autoatendimento
 * os edita (só a edição administrativa, via `updateMemberIdentityAction`);
 * mantê-los fora do schema garante que `{ ...current, ...input }` em
 * `UpdateMyProfileUseCase` nunca os sobrescreva. `fotoUrl` também fica fora
 * daqui pelo mesmo motivo estrutural — mas é editável pelo próprio Irmão,
 * só que por um caminho dedicado (`updateMyPhotoAction` →
 * `UpdateMyPhotoUseCase`, ver "Meu Espaço"), já que precisa de upload de
 * arquivo, não cabe como campo de formulário comum.
 */
export const memberSelfEditSchema = memberBaseSchema.pick({
  telefone: true,
  whatsapp: true,
  endereco: true,
  profissao: true,
  empresa: true,
  estadoCivil: true,
  conjugeNome: true,
  conjugeDataNascimento: true,
  conjugeAniversarioDia: true,
  conjugeAniversarioMes: true,
  dataCasamento: true,
  filhos: true,
});
export type MemberSelfEditValues = z.infer<typeof memberSelfEditSchema>;
