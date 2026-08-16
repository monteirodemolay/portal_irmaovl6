import { z } from 'zod';
import { ARCHIVE_RELATION_NODE_KINDS, ARCHIVE_RELATION_TYPE_KEYS } from '../enums/archive';

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

export const archiveRelationSchema = z
  .object({
    origemTipo: z.enum(ARCHIVE_RELATION_NODE_KINDS),
    origemId: z.string().min(1),
    destinoTipo: z.enum(ARCHIVE_RELATION_NODE_KINDS),
    destinoId: z.string().min(1),
    tipo: z.enum(ARCHIVE_RELATION_TYPE_KEYS),
    descricao: z.string().max(2000).nullable(),
  })
  .refine((data) => data.origemTipo !== data.destinoTipo || data.origemId !== data.destinoId, {
    message: 'Um registro não pode se relacionar consigo mesmo.',
    path: ['destinoId'],
  });
export type ArchiveRelationFormValues = z.infer<typeof archiveRelationSchema>;

export const archiveExhibitionSectionSchema = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1).max(200),
  texto: z.string().max(4000).nullable(),
  itemIds: z.array(z.string()),
});
export type ArchiveExhibitionSectionValues = z.infer<typeof archiveExhibitionSectionSchema>;

export const archiveExhibitionSchema = z.object({
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
export type ArchiveExhibitionFormValues = z.infer<typeof archiveExhibitionSchema>;

export const archiveCatalogEntrySchema = z.object({
  origemId: z.string().min(1),
  tituloCurado: z.string().max(200).nullable(),
  contextoHistorico: z.string().max(8000).nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20),
});
export type ArchiveCatalogEntryFormValues = z.infer<typeof archiveCatalogEntrySchema>;
