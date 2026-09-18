import { z } from 'zod';

export const libraryCategorySchema = z.object({
  nome: z.string().min(1).max(150),
  categoriaPaiId: z.string().nullable(),
  ordem: z.coerce.number().int().min(0),
});
export type LibraryCategoryFormValues = z.infer<typeof libraryCategorySchema>;

export const libraryShelfSchema = z.object({
  codigo: z.string().trim().min(1).max(40),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(500).nullable(),
});
export const libraryShelfTransferSchema = z.object({ targetShelfId: z.string().min(1) });
export const libraryPickupExtensionSchema = z.object({
  pickupDeadlineAt: z.coerce.date(),
  reason: z.string().trim().min(5).max(500),
});

export const libraryItemSchema = z
  .object({
    fileId: z.string().min(1).nullable(),
    categoriaId: z.string().min(1),
    subcategoriaId: z.string().nullable(),
    permiteLeituraOnline: z.boolean(),
    titulo: z.string().min(2).max(240),
    autor: z.string().max(180).nullable(),
    tipoMaterial: z.enum(['livro', 'artigo', 'periodico', 'publicacao', 'outro']),
    formato: z.enum(['digital', 'fisico', 'fisico_digital']),
    anoPublicacao: z.coerce.number().int().min(1000).max(2200).nullable(),
    editora: z.string().max(180).nullable(),
    isbn: z.string().max(32).nullable(),
    codigoBarras: z.string().max(32).nullable(),
    codigoClassificacao: z.string().max(80).nullable(),
    palavrasChave: z.array(z.string().min(1).max(50)).max(20),
    sinopse: z.string().max(4000).nullable(),
    parecerBibliotecario: z.string().max(4000).nullable(),
    capaUrl: z.string().url().nullable(),
    prazoEmprestimoDias: z.coerce.number().int().min(1).max(180),
    codigoTombo: z.string().max(80).nullable(),
    shelfId: z.string().min(1).nullable(),
    localizacao: z.string().max(180).nullable(),
    estadoGeral: z
      .enum(['novo', 'otimo', 'bom', 'regular', 'danificado', 'restauracao'])
      .nullable(),
    observacoesExemplar: z.string().max(1000).nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.formato !== 'fisico' && !value.fileId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fileId'],
        message: 'Arquivo digital obrigatório.',
      });
    if (value.formato !== 'digital' && (!value.codigoTombo || !value.shelfId || !value.estadoGeral))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codigoTombo'],
        message: 'Dados do exemplar físico obrigatórios.',
      });
  });
export type LibraryItemFormValues = z.infer<typeof libraryItemSchema>;

export const libraryCartLoanRequestSchema = z.object({
  libraryItemIds: z.array(z.string().min(1)).min(1).max(10),
  pickupEventId: z.string().min(1),
});
export const libraryReviewSchema = z.object({
  libraryItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comentario: z.string().max(1500).nullable(),
});
export const libraryOccurrenceSchema = z.object({
  loanId: z.string().min(1),
  motivo: z.enum(['perda', 'roubo', 'extravio', 'dano_irrecuperavel', 'outro']),
  relato: z.string().min(20).max(3000),
  occurredAt: z.coerce.date(),
});
export const libraryOccurrenceAttestationSchema = z.object({
  occurrenceId: z.string().min(1),
  decision: z.enum(['confirmado', 'rejeitado']),
  librarianAttestation: z.string().min(10).max(3000),
});
export const libraryWriteOffSchema = z.object({
  copyId: z.string().min(1),
  motivo: z.enum(['perda', 'roubo', 'extravio', 'dano_irrecuperavel', 'outro']),
  relato: z.string().min(20).max(3000),
  occurredAt: z.coerce.date(),
});
