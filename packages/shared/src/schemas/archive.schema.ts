import { z } from 'zod';
import {
  ARCHIVE_CONTRIBUTION_TYPE_KEYS,
  ARCHIVE_ITEM_TYPE_KEYS,
  ARCHIVE_RELATION_NODE_KINDS,
  ARCHIVE_RELATION_TYPE_KEYS,
} from '../enums/archive';
import { ACCESS_LEVEL_KEYS } from '../enums/access-level';
import { ARCHIVE_MEDIA_TYPE_KEYS, MEDIA_ASSET_PROVIDER_KEYS } from '../enums/media-asset';

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

export const archiveContributionSchema = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().min(1).max(4000),
  tipo: z.enum(ARCHIVE_CONTRIBUTION_TYPE_KEYS),
});
export type ArchiveContributionFormValues = z.infer<typeof archiveContributionSchema>;

// ---------------------------------------------------------------------
// Fase 1 da Fundação do Acervo VL6 (docs/architecture/11-acervo-vl6.md
// §11.5) — `archiveItems`, `mediaAssets` e o vínculo entre eles.
// ---------------------------------------------------------------------

export const archiveItemSchema = z.object({
  eventId: z.string().min(1),
  boardTermId: z.string().min(1).nullable(),
  titulo: z.string().min(1).max(200),
  tipo: z.enum(ARCHIVE_ITEM_TYPE_KEYS),
  descricao: z.string().max(4000).nullable(),
  nivelAcesso: z.enum(ACCESS_LEVEL_KEYS),
});
export type ArchiveItemFormValues = z.infer<typeof archiveItemSchema>;

/**
 * Entrada de `RegisterMediaAssetUseCase` — metadados técnicos já calculados
 * de um upload físico já realizado (o upload em si é escopo da Central de
 * Publicação, fase futura).
 */
export const registerMediaAssetSchema = z.object({
  originalName: z.string().min(1).max(300),
  normalizedName: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  extension: z.string().min(1).max(20),
  size: z.coerce.number().int().min(0),
  sha256: z.string().regex(/^[a-f0-9]{64}$/, 'sha256 deve ter 64 caracteres hexadecimais.'),
  provider: z.enum(MEDIA_ASSET_PROVIDER_KEYS),
  storageKey: z.string().min(1),
  width: z.coerce.number().int().min(0).nullable(),
  height: z.coerce.number().int().min(0).nullable(),
  duration: z.coerce.number().min(0).nullable(),
});
export type RegisterMediaAssetFormValues = z.infer<typeof registerMediaAssetSchema>;

/**
 * Entrada de `AttachMediaToArchiveItemUseCase` — nunca inclui
 * `eventId`/`boardTermId`: são sempre herdados do `ArchiveItem` pai, para
 * impedir mídia "solta" sem o mesmo vínculo de proveniência do item.
 */
export const attachMediaToArchiveItemSchema = z.object({
  archiveItemId: z.string().min(1),
  mediaAssetId: z.string().min(1),
  mediaType: z.enum(ARCHIVE_MEDIA_TYPE_KEYS),
  documentType: z.string().max(100).nullable(),
  role: z.string().max(100).nullable(),
  order: z.coerce.number().int().min(0),
  caption: z.string().max(1000).nullable(),
  altText: z.string().max(300).nullable(),
  accessLevel: z.enum(ACCESS_LEVEL_KEYS),
  allowDownload: z.boolean(),
});
export type AttachMediaToArchiveItemFormValues = z.infer<typeof attachMediaToArchiveItemSchema>;

// ---------------------------------------------------------------------
// Fase 2 da Central de Publicação do Acervo VL6 (docs/architecture/
// 11-acervo-vl6.md §11.5) — painel de metadados em lote do passo "Enviar".
// ---------------------------------------------------------------------

export const updateArchiveMediaBatchSchema = z.object({
  archiveItemId: z.string().min(1),
  archiveMediaIds: z.array(z.string().min(1)).min(1),
  autor: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  accessLevel: z.enum(ACCESS_LEVEL_KEYS).optional(),
  allowDownload: z.boolean().optional(),
  caption: z.string().max(500).nullable().optional(),
  altText: z.string().max(300).nullable().optional(),
  documentType: z.string().max(80).nullable().optional(),
  role: z.string().max(80).nullable().optional(),
  isFeatured: z.boolean().optional(),
  pessoasIdentificadas: z.array(z.string().min(1)).max(50).optional(),
});
export type UpdateArchiveMediaBatchFormValues = z.infer<typeof updateArchiveMediaBatchSchema>;
