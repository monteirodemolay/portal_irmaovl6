'use server';

import { createHash, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import {
  errorToLogContext,
  eventSchema,
  logger,
  parseBrazilDateTimeLocal,
  updateArchiveMediaBatchSchema,
  type AccessLevel,
  type ArchiveItemTypeKey,
  type ArchiveMediaTypeKey,
} from '@vl6/shared';
import {
  ARCHIVE_ITEM_PUBLICATION_BLOCKER_LABELS,
  getArchiveItemPublicationBlockers,
  type Event,
} from '@vl6/domain';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const PUBLISH_HUB_PATH = '/admin/acervo/publicar';

// ---------------------------------------------------------------------
// Central de Publicação (Fase 2, docs/architecture/11-acervo-vl6.md
// §11.5) — validação de MIME real + tamanho unificada para todo tipo de
// mídia aceito pelo upload em lote (mesmo padrão de
// `ALLOWED_FILE_MIME_TYPES`/`MAX_FILE_SIZE_BYTES` de
// `document-management-actions.ts`, agora também cobrindo áudio).
// ---------------------------------------------------------------------

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

// Alinhado ao `bodySizeLimit: '10mb'` de Server Actions (next.config.ts) —
// cada arquivo do lote vira uma chamada de Server Action independente
// (ver `uploadArchiveMediaAction`), então o limite é por arquivo, não por lote.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Classifica pelo MIME real detectado no servidor (`file.type`) — nunca pela extensão nem pelo que o cliente informou. */
function classifyMediaType(mimeType: string): ArchiveMediaTypeKey | null {
  if (IMAGE_MIME_TYPES.includes(mimeType)) return 'foto';
  if (VIDEO_MIME_TYPES.includes(mimeType)) return 'video';
  if (AUDIO_MIME_TYPES.includes(mimeType)) return 'audio';
  if (DOCUMENT_MIME_TYPES.includes(mimeType)) return 'documento';
  return null;
}

const ARCHIVE_ITEM_TYPE_BY_MEDIA_TYPE: Record<ArchiveMediaTypeKey, ArchiveItemTypeKey> = {
  foto: 'fotografia',
  video: 'audiovisual',
  audio: 'audiovisual',
  documento: 'documento',
};

// Faixa Unicode "Combining Diacritical Marks" (U+0300-U+036F), construída via
// code points para evitar caracteres de combinação literais no código-fonte.
const COMBINING_MARKS_PATTERN = new RegExp(
  `[${String.fromCodePoint(0x0300)}-${String.fromCodePoint(0x036f)}]`,
  'g',
);

/** Remove acentos e caracteres fora de [a-zA-Z0-9._-] do nome original antes de compor o path no storage. */
function sanitizeFileName(name: string): string {
  const withoutAccents = name.normalize('NFKD').replace(COMBINING_MARKS_PATTERN, '');
  const safe = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '-');
  return safe.slice(-150) || 'arquivo';
}

// ---------------------------------------------------------------------
// Passo 1 — Evento
// ---------------------------------------------------------------------

export interface BoardTermPreview {
  id: string;
  nome: string;
}

/**
 * Preview (sem persistir) da Gestão identificada para uma data — disparado
 * ao mudar a data no cadastro retroativo inline do passo 1, ANTES de
 * salvar o evento.
 */
export async function previewBoardTermForDateAction(
  dataInicio: string,
): Promise<BoardTermPreview | null> {
  const session = await requireSession();
  const date = parseBrazilDateTimeLocal(dataInicio);
  if (Number.isNaN(date.getTime())) return null;

  const container = createServerContainer();
  const boardTerm = await container.useCases.findBoardTermForDate.execute(
    session.authContext,
    date,
  );
  return boardTerm ? { id: boardTerm.id, nome: boardTerm.nome } : null;
}

export interface CreateEventForPublishState {
  error: string | null;
  event: Event | null;
}

/**
 * Cadastro retroativo inline do passo 1. `CreateEventUseCase` (Fase 1) NÃO
 * identifica a Gestão sozinho — `boardTermId` é um input obrigatório dele,
 * então esta action precisa rodar `FindBoardTermForDateUseCase` aqui e
 * repassar o resultado, exatamente como `previewBoardTermForDateAction` já
 * faz para a prévia. Sem isso, o evento seria salvo com `boardTermId: null`
 * mesmo quando o admin viu "Gestão identificada" na tela antes de enviar.
 */
export async function createEventForPublishAction(
  _prevState: CreateEventForPublishState,
  formData: FormData,
): Promise<CreateEventForPublishState> {
  const session = await requireSession();

  const dataInicioRaw = formData.get('dataInicio');
  const parsedDate =
    typeof dataInicioRaw === 'string' ? parseBrazilDateTimeLocal(dataInicioRaw) : null;

  const container = createServerContainer();
  const boardTerm =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? await container.useCases.findBoardTermForDate.execute(session.authContext, parsedDate)
      : null;

  let input;
  try {
    input = eventSchema.parse({
      tipo: formData.get('tipo'),
      titulo: formData.get('titulo'),
      descricao: null,
      local: formData.get('local'),
      dataInicio: parsedDate,
      dataFim: null,
      exigeConfirmacaoPresenca: false,
      capacidadeMaxima: null,
      traje: null,
      chegadaSugerida: null,
      observacoes: null,
      arquivosRelacionados: [],
      boardTermId: boardTerm?.id ?? null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique título, local e data.', event: null };
  }

  const result = await container.useCases.createEvent.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message, event: null };

  revalidatePath(PUBLISH_HUB_PATH);
  return { error: null, event: result.value };
}

// ---------------------------------------------------------------------
// Passo 2 — Enviar (upload unificado)
// ---------------------------------------------------------------------

export interface UploadArchiveMediaResult {
  ok: boolean;
  error: string | null;
  archiveItemId: string | null;
  archiveMediaId: string | null;
  mediaAssetId: string | null;
  mediaType: ArchiveMediaTypeKey | null;
  originalName: string | null;
  duplicateWarning: boolean;
}

function uploadFailure(error: string): UploadArchiveMediaResult {
  return {
    ok: false,
    error,
    archiveItemId: null,
    archiveMediaId: null,
    mediaAssetId: null,
    mediaType: null,
    originalName: null,
    duplicateWarning: false,
  };
}

/**
 * Upload de UM arquivo do lote — chamado em paralelo (com limite de
 * concorrência) pela fila de upload do passo 2, uma requisição
 * independente por arquivo para que a falha de um não derrube os demais.
 *
 * Fluxo: 1) upload físico ao Blob, 2) `RegisterMediaAssetUseCase`
 * (hash SHA-256 calculado aqui, no servidor), 3) garante um `ArchiveItem`
 * para o evento (cria na primeira mídia do lote se `archiveItemId` não foi
 * informado; reaproveitado pelas chamadas seguintes do mesmo lote), 4)
 * `AttachMediaToArchiveItemUseCase`. Reverte o upload físico (`storage.
 * delete`) se qualquer passo posterior falhar.
 */
export async function uploadArchiveMediaAction(
  formData: FormData,
): Promise<UploadArchiveMediaResult> {
  const session = await requireSession();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return uploadFailure('Selecione um arquivo válido.');
  }

  const eventId = String(formData.get('eventId') ?? '');
  if (!eventId) return uploadFailure('Evento não informado.');

  const archiveItemIdRaw = formData.get('archiveItemId');
  const archiveItemId =
    typeof archiveItemIdRaw === 'string' && archiveItemIdRaw.length > 0 ? archiveItemIdRaw : null;

  const mediaType = classifyMediaType(file.type);
  if (!mediaType) {
    return uploadFailure(`Tipo de arquivo não suportado: ${file.type || 'desconhecido'}.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return uploadFailure('Arquivo muito grande: o limite é 10 MB.');
  }

  const container = createServerContainer();

  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== session.authContext.tenantId) {
    return uploadFailure('Evento não encontrado.');
  }

  if (archiveItemId) {
    const existingItem = await container.repositories.archiveItem.findById(archiveItemId);
    if (!existingItem || existingItem.tenantId !== session.authContext.tenantId) {
      return uploadFailure('Item do Acervo do lote não encontrado.');
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const safeName = sanitizeFileName(file.name);
  const storage = new VercelBlobStorageAdapter();
  const path = `tenants/${session.authContext.tenantId}/archive/${randomUUID()}-${safeName}`;

  let upload;
  try {
    upload = await storage.upload({
      path,
      buffer,
      contentType: file.type || 'application/octet-stream',
    });
  } catch (error) {
    logger.error('Falha ao enviar mídia do Acervo para o storage', {
      route: 'uploadArchiveMediaAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'uploadArchiveMediaAction' } });
    return uploadFailure('Não foi possível enviar o arquivo. Tente novamente em instantes.');
  }

  const rollbackUpload = async () => {
    try {
      await storage.delete(path);
    } catch (error) {
      logger.error('Falha ao reverter upload órfão após erro no Acervo', {
        route: 'uploadArchiveMediaAction:rollback',
        path,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'uploadArchiveMediaAction:rollback' } });
    }
  };

  const extension = safeName.includes('.') ? (safeName.split('.').pop() ?? '') : '';

  const registerResult = await container.useCases.registerMediaAsset.execute(session.authContext, {
    originalName: file.name,
    normalizedName: safeName,
    mimeType: file.type || 'application/octet-stream',
    extension,
    size: upload.sizeBytes,
    sha256,
    provider: 'vercel_blob',
    storageKey: path,
    width: null,
    height: null,
    duration: null,
  });
  if (!registerResult.ok) {
    await rollbackUpload();
    return uploadFailure(registerResult.error.message);
  }

  let resolvedArchiveItemId = archiveItemId;
  if (!resolvedArchiveItemId) {
    const createItemResult = await container.useCases.createArchiveItem.execute(
      session.authContext,
      {
        eventId: event.id,
        boardTermId: event.boardTermId,
        titulo: event.titulo,
        tipo: ARCHIVE_ITEM_TYPE_BY_MEDIA_TYPE[mediaType],
        descricao: null,
        nivelAcesso: event.nivelAcesso,
      },
    );
    if (!createItemResult.ok) {
      await rollbackUpload();
      return uploadFailure(createItemResult.error.message);
    }
    resolvedArchiveItemId = createItemResult.value.id;
  }

  const attachResult = await container.useCases.attachMediaToArchiveItem.execute(
    session.authContext,
    {
      archiveItemId: resolvedArchiveItemId,
      mediaAssetId: registerResult.value.mediaAsset.id,
      mediaType,
      documentType: null,
      role: null,
      order: 0,
      caption: null,
      altText: null,
      // Herdado do evento por padrão — o painel de metadados em lote
      // permite sobrescrever depois (item 3 do escopo da Fase 2).
      accessLevel: event.nivelAcesso,
      allowDownload: false,
    },
  );
  if (!attachResult.ok) {
    await rollbackUpload();
    return uploadFailure(attachResult.error.message);
  }

  revalidatePath(PUBLISH_HUB_PATH);

  return {
    ok: true,
    error: null,
    archiveItemId: resolvedArchiveItemId,
    archiveMediaId: attachResult.value.id,
    mediaAssetId: registerResult.value.mediaAsset.id,
    mediaType,
    originalName: file.name,
    duplicateWarning: registerResult.value.possivelDuplicata !== null,
  };
}

export interface UpdateArchiveMediaBatchFieldsInput {
  autor?: string | null;
  tags?: string[];
  accessLevel?: AccessLevel;
  allowDownload?: boolean;
  caption?: string | null;
  altText?: string | null;
  documentType?: string | null;
  role?: string | null;
  isFeatured?: boolean;
}

export interface UpdateArchiveMediaBatchActionState {
  ok: boolean;
  error: string | null;
}

/** Painel de metadados em lote — aplica os campos informados a todas as `ArchiveMedia` já enviadas/em fila. */
export async function updateArchiveMediaBatchAction(
  archiveItemId: string,
  archiveMediaIds: string[],
  fields: UpdateArchiveMediaBatchFieldsInput,
): Promise<UpdateArchiveMediaBatchActionState> {
  const session = await requireSession();

  let input;
  try {
    input = updateArchiveMediaBatchSchema.parse({ archiveItemId, archiveMediaIds, ...fields });
  } catch {
    return { ok: false, error: 'Dados inválidos.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateArchiveMediaBatch.execute(session.authContext, {
    archiveItemId: input.archiveItemId,
    archiveMediaIds: input.archiveMediaIds,
    fields: {
      autor: input.autor,
      tags: input.tags,
      accessLevel: input.accessLevel,
      allowDownload: input.allowDownload,
      caption: input.caption,
      altText: input.altText,
      documentType: input.documentType,
      role: input.role,
      isFeatured: input.isFeatured,
    },
  });
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null };
}

// ---------------------------------------------------------------------
// Passo 3 — Organizar / Publicar (Fase 3,
// docs/architecture/11-acervo-vl6.md §11.6)
// ---------------------------------------------------------------------

export interface ReorderArchiveMediaState {
  ok: boolean;
  error: string | null;
}

/** Aba "Fotografias" — drag-and-drop nativo no client, persiste a ordem final. */
export async function reorderArchiveMediaAction(
  archiveItemId: string,
  orderedArchiveMediaIds: string[],
): Promise<ReorderArchiveMediaState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.reorderArchiveMedia.execute(
    session.authContext,
    archiveItemId,
    orderedArchiveMediaIds,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null };
}

export interface SimpleActionState {
  ok: boolean;
  error: string | null;
}

/** Define a fotografia de capa do item (`SetArchiveItemCoverUseCase`, Fase 1). */
export async function setArchiveItemCoverAction(
  archiveItemId: string,
  archiveMediaId: string,
): Promise<SimpleActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.setArchiveItemCover.execute(
    session.authContext,
    archiveItemId,
    archiveMediaId,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null };
}

/** Move uma única mídia para a lixeira — o item e as demais mídias seguem intactos. */
export async function softDeleteArchiveMediaAction(
  archiveMediaId: string,
): Promise<SimpleActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteArchiveMedia.execute(
    session.authContext,
    archiveMediaId,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null };
}

/** Atualiza os campos editoriais de UMA mídia — reaproveita `UpdateArchiveMediaBatchUseCase` com uma lista de um elemento só. */
export async function updateArchiveMediaFieldsAction(
  archiveItemId: string,
  archiveMediaId: string,
  fields: UpdateArchiveMediaBatchFieldsInput,
): Promise<UpdateArchiveMediaBatchActionState> {
  return updateArchiveMediaBatchAction(archiveItemId, [archiveMediaId], fields);
}

export interface PublicationChecklistResult {
  blockers: string[];
  canPublish: boolean;
}

/**
 * Checklist de publicação — reaproveita `getArchiveItemPublicationBlockers`
 * (função pura exportada por `PublishArchiveItemUseCase`) para nunca
 * duplicar a regra que decide o que bloqueia a publicação de verdade.
 */
export async function loadPublicationChecklistAction(
  archiveItemId: string,
): Promise<PublicationChecklistResult> {
  const session = await requireSession();
  const container = createServerContainer();

  const item = await container.repositories.archiveItem.findById(archiveItemId);
  if (!item || item.tenantId !== session.authContext.tenantId) {
    return { blockers: [], canPublish: false };
  }
  const medias = await container.repositories.archiveMedia.findByArchiveItemId(archiveItemId);
  const blockers = getArchiveItemPublicationBlockers(item, medias);

  return {
    blockers: blockers.map((blocker) => ARCHIVE_ITEM_PUBLICATION_BLOCKER_LABELS[blocker]),
    canPublish: blockers.length === 0,
  };
}

export interface PublishArchiveItemState {
  ok: boolean;
  error: string | null;
}

/** Botão "Publicar Evento" — transição definitiva para `publicado` (`PublishArchiveItemUseCase`). */
export async function publishArchiveItemAction(
  archiveItemId: string,
): Promise<PublishArchiveItemState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishArchiveItem.execute(
    session.authContext,
    archiveItemId,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null };
}

// ---------------------------------------------------------------------
// Passo 3 — resumo/organização do rascunho
// ---------------------------------------------------------------------

export interface ArchiveItemSummaryMedia {
  id: string;
  mediaAssetId: string;
  mediaType: ArchiveMediaTypeKey;
  publicacaoStatus: string;
  originalName: string;
  mimeType: string;
  size: number;
  order: number;
  caption: string | null;
  altText: string | null;
  documentType: string | null;
  role: string | null;
  isCover: boolean;
  isFeatured: boolean;
}

export interface ArchiveItemSummary {
  archiveItemId: string;
  titulo: string;
  eventoTitulo: string;
  gestaoNome: string | null;
  medias: ArchiveItemSummaryMedia[];
}

/** Carrega o resumo de um `ArchiveItem` (rascunho novo ou retomado) para o passo 3. */
export async function loadArchiveItemSummaryAction(
  archiveItemId: string,
): Promise<ArchiveItemSummary | null> {
  const session = await requireSession();
  const container = createServerContainer();

  const item = await container.repositories.archiveItem.findById(archiveItemId);
  if (!item || item.tenantId !== session.authContext.tenantId) return null;

  const [event, medias, boardTerm] = await Promise.all([
    container.repositories.event.findById(item.eventId),
    container.repositories.archiveMedia.findByArchiveItemId(item.id),
    item.boardTermId ? container.repositories.boardTerm.findById(item.boardTermId) : null,
  ]);
  const mediaAssets = await Promise.all(
    medias.map((media) => container.repositories.mediaAsset.findById(media.mediaAssetId)),
  );

  return {
    archiveItemId: item.id,
    titulo: item.titulo,
    eventoTitulo: event?.titulo ?? '—',
    gestaoNome: boardTerm?.nome ?? null,
    medias: medias
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((media) => {
        const asset = mediaAssets.find((candidate) => candidate?.id === media.mediaAssetId);
        return {
          id: media.id,
          mediaAssetId: media.mediaAssetId,
          mediaType: media.mediaType,
          publicacaoStatus: media.publicacaoStatus,
          originalName: asset?.originalName ?? 'arquivo',
          mimeType: asset?.mimeType ?? '',
          size: asset?.size ?? 0,
          order: media.order,
          caption: media.caption,
          altText: media.altText,
          documentType: media.documentType,
          role: media.role,
          isCover: media.isCover,
          isFeatured: media.isFeatured,
        };
      }),
  };
}
