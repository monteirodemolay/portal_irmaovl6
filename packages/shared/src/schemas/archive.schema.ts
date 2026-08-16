import { z } from 'zod';

export const archiveCollectionSchema = z.object({
  titulo: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.'),
  descricaoEditorial: z.string().max(4000).nullable(),
  curadoPor: z.string().max(200).nullable(),
  capaUrl: z.string().url().nullable(),
  ordem: z.coerce.number().int().min(0),
});
export type ArchiveCollectionFormValues = z.infer<typeof archiveCollectionSchema>;
