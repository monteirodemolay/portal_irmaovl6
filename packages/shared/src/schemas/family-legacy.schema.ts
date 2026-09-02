import { z } from 'zod';
import {
  FAMILY_CHILD_ROLES,
  FAMILY_PARENT_ROLES,
  FAMILY_PERSON_REF_KINDS,
  FAMILY_RELATION_KINDS,
  FAMILY_REVIEW_STATUSES,
  FAMILY_SOURCE_KINDS,
  FAMILY_VISIBILITY_LEVELS,
  FRATERNAL_AFFILIATION_KINDS,
  FRATERNAL_UNIT_KINDS,
  PERSON_FRATERNAL_LINK_STATUSES,
  PERSON_LIFE_STATUSES,
} from '../enums/family-legacy';

/**
 * Cadastro de `FamilyPerson` (familiar externo, sem `Member`). O nome de
 * filho/filha/qualquer familiar é válido mesmo com `fraternalLinkStatus:
 * 'none'` — vínculo fraternal nunca é obrigatório para existir no cadastro
 * familiar (03_ARQUITETURA_E_DADOS.md).
 */
export const familyPersonSchema = z
  .object({
    linkedMemberId: z.string().min(1).nullable(),
    nomeCompleto: z.string().trim().min(3).max(150),
    fotoUrl: z.string().url().nullable(),
    dataNascimento: z.coerce.date().nullable(),
    dataFalecimento: z.coerce.date().nullable(),
    lifeStatus: z.enum(PERSON_LIFE_STATUSES),
    cidade: z.string().trim().max(100).nullable(),
    estado: z.string().trim().max(2).nullable(),
    pais: z.string().trim().max(100).nullable(),
    biografia: z.string().trim().max(8000).nullable(),
    menorDeIdade: z.boolean(),
    fraternalLinkStatus: z.enum(PERSON_FRATERNAL_LINK_STATUSES),
    visibility: z.enum(FAMILY_VISIBILITY_LEVELS),
    sourceKind: z.enum(FAMILY_SOURCE_KINDS),
    sourceDescription: z.string().trim().max(2000).nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.dataNascimento && data.dataFalecimento && data.dataFalecimento < data.dataNascimento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dataFalecimento'],
        message: 'A data de falecimento não pode ser anterior ao nascimento.',
      });
    }

    // Regra de integridade: menor de idade nunca pode ser publicado (perfil
    // ou Acervo) — nenhuma etapa deste módulo constrói o caminho de
    // publicação ainda, mas a regra já existe no domínio para valer quando
    // a Etapa 9 chegar.
    if (data.menorDeIdade && !['private', 'administration'].includes(data.visibility)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['visibility'],
        message: 'Pessoa menor de idade não pode ser publicada.',
      });
    }

    // Fonte obrigatória para qualquer publicação estilo Memorial (visibility
    // 'archive') — regra exigida mesmo sem o Memorial em si existir ainda
    // (07_TESTES_E_ACEITE.md: "exige fonte para publicação").
    if (
      data.visibility === 'archive' &&
      (data.sourceKind === 'self_declaration' ? false : !data.sourceDescription?.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceDescription'],
        message: 'Publicação no Acervo exige a descrição da fonte.',
      });
    }
  });

export const familyRelationshipSchema = z
  .object({
    fromKind: z.enum(FAMILY_PERSON_REF_KINDS),
    fromId: z.string().min(1),
    toKind: z.enum(FAMILY_PERSON_REF_KINDS),
    toId: z.string().min(1),
    relationKind: z.enum(FAMILY_RELATION_KINDS),
    parentRole: z.enum(FAMILY_PARENT_ROLES).nullable(),
    childRole: z.enum(FAMILY_CHILD_ROLES).nullable(),
    declaredLabel: z.string().trim().max(100).nullable(),
    visibility: z.enum(FAMILY_VISIBILITY_LEVELS),
    sourceKind: z.enum(FAMILY_SOURCE_KINDS),
    sourceDescription: z.string().trim().max(2000).nullable(),
  })
  .refine((value) => value.fromKind !== value.toKind || value.fromId !== value.toId, {
    path: ['toId'],
    message: 'Uma pessoa não pode possuir vínculo familiar consigo mesma.',
  })
  .superRefine((value, ctx) => {
    if (value.relationKind === 'declared_kinship' && !value.declaredLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['declaredLabel'],
        message: 'Informe o parentesco declarado.',
      });
    }
  });

export const personFraternalRecordSchema = z.object({
  personKind: z.enum(FAMILY_PERSON_REF_KINDS),
  personId: z.string().min(1),
  affiliationKind: z.enum(FRATERNAL_AFFILIATION_KINDS),
  organizacaoNome: z.string().trim().max(200).nullable(),
  unidadeTipo: z.enum(FRATERNAL_UNIT_KINDS),
  unidadeNome: z.string().trim().max(200).nullable(),
  unidadeNumero: z.string().trim().max(30).nullable(),
  cidade: z.string().trim().max(150).nullable(),
  estado: z.string().trim().max(2).nullable(),
  pais: z.string().trim().max(100).nullable(),
  potencia: z.string().trim().max(200).nullable(),
  rito: z.string().trim().max(150).nullable(),
  dataIniciacao: z.coerce.date().nullable(),
  dataElevacao: z.coerce.date().nullable(),
  dataExaltacao: z.coerce.date().nullable(),
  grau: z.string().trim().max(100).nullable(),
  cargos: z.array(z.string().trim().min(1).max(150)).max(50),
  titulos: z.array(z.string().trim().min(1).max(150)).max(50),
  passouAoOrienteEternoEm: z.coerce.date().nullable(),
  resumoLegado: z.string().trim().max(8000).nullable(),
  visibility: z.enum(FAMILY_VISIBILITY_LEVELS),
  sourceKind: z.enum(FAMILY_SOURCE_KINDS),
  sourceDescription: z.string().trim().max(2000).nullable(),
  reviewStatus: z.enum(FAMILY_REVIEW_STATUSES),
});

export type FamilyPersonFormValues = z.infer<typeof familyPersonSchema>;
export type FamilyRelationshipFormValues = z.infer<typeof familyRelationshipSchema>;
export type PersonFraternalRecordFormValues = z.infer<typeof personFraternalRecordSchema>;
