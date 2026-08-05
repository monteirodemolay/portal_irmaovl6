import { z } from 'zod';

export const libraryCategorySchema = z.object({
  nome: z.string().min(1).max(150),
  categoriaPaiId: z.string().nullable(),
  ordem: z.coerce.number().int().min(0),
});
export type LibraryCategoryFormValues = z.infer<typeof libraryCategorySchema>;

export const libraryItemSchema = z.object({
  fileId: z.string().min(1),
  categoriaId: z.string().min(1),
  subcategoriaId: z.string().nullable(),
  permiteLeituraOnline: z.boolean(),
});
export type LibraryItemFormValues = z.infer<typeof libraryItemSchema>;
