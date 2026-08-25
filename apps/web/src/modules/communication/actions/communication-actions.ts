'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import type { ArtTemplateType, PublicationChannel, PublicationOutputFormat } from '@vl6/shared';
import { errorToLogContext, logger } from '@vl6/shared';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import type { TemplateField } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

const BASE_PATH = '/admin/comunicacao';
const MAX_TEMPLATE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_ASSET_SIZE_BYTES = 15 * 1024 * 1024;

function parseFields(raw: FormDataEntryValue | null): TemplateField[] {
  if (typeof raw !== 'string' || !raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as TemplateField[];
}

export interface CommunicationActionState {
  error: string | null;
}

/** Cadastro de modelo — a imagem de fundo é enviada uma única vez aqui. */
export async function createArtTemplateAction(
  _prevState: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Nome do modelo é obrigatório.' };

  const type = formData.get('type') as ArtTemplateType;
  const file = formData.get('background');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Envie a imagem de fundo do modelo.' };
  }
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    return { error: 'A imagem de fundo deve ser PNG ou JPEG.' };
  }
  if (file.size > MAX_TEMPLATE_SIZE_BYTES) {
    return { error: 'Arquivo muito grande: o limite é 15 MB.' };
  }

  const width = Number(formData.get('backgroundWidth'));
  const height = Number(formData.get('backgroundHeight'));
  if (!width || !height) {
    return { error: 'Não foi possível ler as dimensões da imagem.' };
  }

  const storage = new VercelBlobStorageAdapter();
  const path = `tenants/${session.authContext.tenantId}/communication-templates/${randomUUID()}.png`;
  let backgroundUrl: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await storage.upload({ path, buffer, contentType: file.type });
    backgroundUrl = upload.url;
  } catch (error) {
    logger.error('Falha ao enviar modelo de arte para o storage', {
      route: 'createArtTemplateAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'createArtTemplateAction' } });
    return { error: 'Não foi possível enviar a imagem. Tente novamente em instantes.' };
  }

  const result = await container.useCases.createArtTemplate.execute(session.authContext, {
    name,
    type,
    backgroundUrl,
    backgroundWidth: width,
    backgroundHeight: height,
    outputFormats: formData.getAll('outputFormats') as PublicationOutputFormat[],
    fields: parseFields(formData.get('fields')),
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`${BASE_PATH}/modelos`);
  return { error: null };
}

/** Reposicionar campos, renomear ou ativar/desativar — nunca troca a imagem de fundo. */
export async function updateArtTemplateAction(
  templateId: string,
  _prevState: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Nome do modelo é obrigatório.' };

  const result = await container.useCases.updateArtTemplate.execute(
    session.authContext,
    templateId,
    {
      name,
      outputFormats: formData.getAll('outputFormats') as PublicationOutputFormat[],
      fields: parseFields(formData.get('fields')),
      active: formData.get('active') === 'on',
    },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`${BASE_PATH}/modelos`);
  revalidatePath(`${BASE_PATH}/modelos/${templateId}`);
  return { error: null };
}

/** Edita título, campos, legenda e texto de WhatsApp de uma publicação em produção. */
export async function updatePublicationAction(
  publicationId: string,
  input: {
    title: string;
    fields: Record<string, string>;
    caption: string | null;
    whatsappText: string | null;
  },
): Promise<{ error: string | null }> {
  const session = await requireSession();
  const container = createServerContainer();

  const current = await container.repositories.publication.findById(publicationId);
  const result = await container.useCases.updatePublication.execute(
    session.authContext,
    publicationId,
    { ...input, scheduledFor: current?.scheduledFor ?? null },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath(BASE_PATH);
  return { error: null };
}

/**
 * Recebe o PNG já renderizado pelo `<canvas>` do navegador (a Central de
 * Comunicação nunca renderiza imagem no servidor — mesma cautela do
 * incidente `pdfjs-dist` em runtime serverless), envia ao Storage e
 * registra o resultado na publicação.
 */
export async function uploadPublicationAssetAction(
  publicationId: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const session = await requireSession();
  const container = createServerContainer();

  const file = formData.get('asset');
  const format = formData.get('format') as PublicationOutputFormat;
  const width = Number(formData.get('width'));
  const height = Number(formData.get('height'));
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Nenhuma imagem gerada para enviar.' };
  }
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    return { error: 'Arte gerada excede o tamanho máximo permitido.' };
  }

  const storage = new VercelBlobStorageAdapter();
  const path = `tenants/${session.authContext.tenantId}/communication-assets/${publicationId}/${format}-${randomUUID()}.png`;
  let url: string;
  let checksum: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await storage.upload({ path, buffer, contentType: 'image/png' });
    url = upload.url;
    const { createHash } = await import('node:crypto');
    checksum = createHash('sha256').update(buffer).digest('hex');
  } catch (error) {
    logger.error('Falha ao enviar arte gerada para o storage', {
      route: 'uploadPublicationAssetAction',
      publicationId,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'uploadPublicationAssetAction' } });
    return { error: 'Não foi possível enviar a imagem gerada. Tente novamente em instantes.' };
  }

  const result = await container.useCases.generatePublicationAsset.execute(
    session.authContext,
    publicationId,
    { format, url, width, height, checksum },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath(BASE_PATH);
  return { error: null };
}

export async function approvePublicationAction(publicationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  await container.useCases.approvePublication.execute(session.authContext, publicationId);
  revalidatePath(BASE_PATH);
}

export async function markPublicationAsPublishedAction(
  publicationId: string,
  channels: PublicationChannel[],
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  await container.useCases.markPublicationAsPublished.execute(
    session.authContext,
    publicationId,
    channels,
  );
  revalidatePath(BASE_PATH);
}

/**
 * Ação "Gerar arte" a partir de um Evento da Agenda — busca (ou cria) a
 * publicação e redireciona pra tela única de edição/geração. Exige que
 * exista ao menos um modelo ativo do tipo "Sessão"; sem isso, orienta o
 * Administrador a cadastrar um antes.
 */
export async function startPublicationFromEventAction(eventId: string): Promise<never> {
  const session = await requireSession();
  const container = createServerContainer();

  const templates = await container.useCases.listArtTemplates.execute(session.authContext);
  const template = templates.find((t) => t.type === 'session' && t.active);
  if (!template) {
    redirect(`${BASE_PATH}/modelos?erro=sem-modelo-de-sessao`);
  }

  const result = await container.useCases.createPublicationFromEvent.execute(
    session.authContext,
    eventId,
    template.id,
  );
  if (!result.ok) {
    redirect(`${BASE_PATH}?erro=${encodeURIComponent(result.error.message)}`);
  }

  redirect(`${BASE_PATH}/publicacoes/${result.value.id}`);
}

export async function archivePublicationAction(publicationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  await container.useCases.archivePublication.execute(session.authContext, publicationId);
  revalidatePath(BASE_PATH);
}
