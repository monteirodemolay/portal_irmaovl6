import { z } from 'zod';

export const LEGAL_DOCUMENT_KEYS = ['politica_privacidade', 'termos_uso'] as const;

export const LEGAL_DOCUMENT_CLASSIFICATIONS = [
  'correcao',
  'adequacao',
  'nova_funcionalidade',
  'mudanca_juridica',
  'mudanca_operacional',
  'mudanca_seguranca',
  'mudanca_lgpd',
  'mudanca_institucional',
] as const;

export const LEGAL_DOCUMENT_IMPACTS = ['baixo', 'medio', 'alto'] as const;

/** Input de `PublishLegalDocumentVersionUseCase` — publicação de nova versão pela Administração. */
export const publishLegalDocumentVersionSchema = z.object({
  documento: z.enum(LEGAL_DOCUMENT_KEYS),
  versao: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use o formato MAJOR.MINOR.PATCH, ex.: 1.2.0.'),
  classificacao: z.enum(LEGAL_DOCUMENT_CLASSIFICATIONS),
  motivo: z.string().min(10, 'Descreva o motivo com pelo menos 10 caracteres.').max(2000),
  impacto: z.enum(LEGAL_DOCUMENT_IMPACTS),
  itensAlterados: z.array(z.string().min(1)).min(1, 'Liste ao menos um item alterado.'),
  exigeNovoAceite: z.boolean(),
  conteudoMarkdown: z.string().min(50, 'O conteúdo publicado parece incompleto.'),
  diffResumo: z.string().max(4000).nullable(),
  responsavel: z.string().min(2).max(200),
});
export type PublishLegalDocumentVersionInput = z.infer<typeof publishLegalDocumentVersionSchema>;

/** Input de `RecordLegalAcceptanceUseCase` a partir de uma Server Action autenticada ou do fluxo de reivindicação de conta. */
export const recordLegalAcceptanceSchema = z.object({
  documento: z.enum(LEGAL_DOCUMENT_KEYS),
  versao: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export type RecordLegalAcceptanceFormInput = z.infer<typeof recordLegalAcceptanceSchema>;
