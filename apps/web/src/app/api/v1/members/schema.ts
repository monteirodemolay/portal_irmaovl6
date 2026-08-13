import { z } from 'zod';

export const listMembersQuerySchema = z.object({
  nome: z.string().optional(),
  grau: z.string().optional(),
  situacao: z.string().optional(),
  cidade: z.string().optional(),
  cim: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const memberResponseSchema = z.object({
  id: z.string(),
  nomeCompleto: z.string(),
  email: z.string(),
  grau: z.string(),
  situacao: z.string(),
  cim: z.string().nullable(),
  cidade: z.string().nullable(),
  dataIniciacao: z.string().nullable().describe('ISO 8601'),
});

export const listMembersResponseSchema = z.object({
  items: z.array(memberResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
