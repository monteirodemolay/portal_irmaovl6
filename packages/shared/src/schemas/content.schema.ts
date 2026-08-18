import { z } from 'zod';

export const newsSchema = z.object({
  titulo: z.string().min(3).max(200),
  subtitulo: z.string().max(300).nullable(),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.'),
  imagemCapaUrl: z.string().url().nullable(),
  conteudoHtml: z.string().min(1),
  categoria: z.string().min(1),
});
export type NewsFormValues = z.infer<typeof newsSchema>;

export const announcementSchema = z.object({
  titulo: z.string().min(3).max(150),
  descricao: z.string().min(1).max(2000),
  prioridade: z.enum(['baixa', 'media', 'alta']),
  destacar: z.boolean(),
  dataExpiracao: z.coerce.date().nullable(),
});
export type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export const newsCommentSchema = z.object({
  texto: z.string().min(1).max(1000),
});
export type NewsCommentFormValues = z.infer<typeof newsCommentSchema>;

export const inspirationalQuoteSchema = z.object({
  texto: z.string().min(3).max(280),
  autor: z.string().min(1).max(120),
});
export type InspirationalQuoteFormValues = z.infer<typeof inspirationalQuoteSchema>;

/** Cadência de rotação da "frase do dia" no Início — ver TenantSettings.citacaoRotacao. */
export const QUOTE_ROTATION_MODES = ['recarga', 'diaria', 'intervalo'] as const;
export type QuoteRotationMode = (typeof QUOTE_ROTATION_MODES)[number];

export const quoteRotationSchema = z.object({
  modo: z.enum(QUOTE_ROTATION_MODES),
  // Só usado quando modo === 'intervalo'; null nos demais modos.
  intervaloMinutos: z.coerce.number().int().min(5).max(10080).nullable(),
});
export type QuoteRotationFormValues = z.infer<typeof quoteRotationSchema>;
