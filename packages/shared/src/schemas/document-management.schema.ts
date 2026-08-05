import { z } from 'zod';
import { FILE_KINDS } from '../enums/document-management';

export const fileAssetSchema = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(2000).nullable(),
  categoriaId: z.string().min(1),
  acervo: z.string().nullable(),
  autor: z.string().nullable(),
  tipo: z.enum(FILE_KINDS),
  urlArquivo: z.string().url(),
  urlMiniatura: z.string().url().nullable(),
  tamanhoBytes: z.coerce.number().int().min(0),
  permitirDownload: z.boolean(),
  ordem: z.coerce.number().int().min(0),
});
export type FileAssetFormValues = z.infer<typeof fileAssetSchema>;

export const fileCategorySchema = z.object({
  nome: z.string().min(1).max(150),
  acervo: z.string().nullable(),
  ordem: z.coerce.number().int().min(0),
});
export type FileCategoryFormValues = z.infer<typeof fileCategorySchema>;
