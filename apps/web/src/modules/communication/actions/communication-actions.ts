'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ArtTemplateType, PublicationChannel, PublicationOutputFormat } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type { TemplateField } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

const BASE_PATH = '/admin/comunicacao';

function parseFields(raw: FormDataEntryValue | null): TemplateField[] {
  if (typeof raw !== 'string' || !raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as TemplateField[];
}

export interface CommunicationActionState {
  error: string | null;
}

/**
 * Cadastro de modelo — a imagem de fundo já chega enviada ao Vercel Blob
 * (upload direto do navegador via `@vercel/blob/client`, ver
 * `/api/comunicacao/blob-upload`): o corpo de uma Server Action tem um teto
 * físico de 4,5 MB na Vercel, que uma imagem institucional em alta
 * resolução ultrapassa com frequência — passar só a URL final aqui evita
 * esse limite por completo.
 */
export async function createArtTemplateAction(
  _prevState: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Nome do modelo é obrigatório.' };

  const type = formData.get('type') as ArtTemplateType;
  const backgroundUrl = String(formData.get('backgroundUrl') ?? '');
  if (!backgroundUrl) {
    return { error: 'Envie a imagem de fundo do modelo.' };
  }

  const width = Number(formData.get('backgroundWidth'));
  const height = Number(formData.get('backgroundHeight'));
  if (!width || !height) {
    return { error: 'Não foi possível ler as dimensões da imagem.' };
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

/** Exclusão lógica — modelo some da biblioteca, mas publicações já geradas a partir dele continuam intactas. */
export async function deleteArtTemplateAction(templateId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deleteArtTemplate.execute(
    session.authContext,
    templateId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath(`${BASE_PATH}/modelos`);
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
 * Recebe a URL de uma arte já renderizada pelo `<canvas>` do navegador (a
 * Central de Comunicação nunca renderiza imagem no servidor — mesma cautela
 * do incidente `pdfjs-dist` em runtime serverless) e já enviada ao Vercel
 * Blob por upload direto do navegador (mesmo motivo de
 * `createArtTemplateAction`: o corpo de uma Server Action tem um teto físico
 * de 4,5 MB na Vercel, e o formato Story em alta resolução ultrapassa isso
 * com frequência) — só registra o resultado na publicação.
 */
export async function uploadPublicationAssetAction(
  publicationId: string,
  input: {
    format: PublicationOutputFormat;
    url: string;
    width: number;
    height: number;
    checksum: string;
  },
): Promise<{ error: string | null }> {
  const session = await requireSession();
  const container = createServerContainer();

  if (!input.url) {
    return { error: 'Nenhuma imagem gerada para enviar.' };
  }

  const result = await container.useCases.generatePublicationAsset.execute(
    session.authContext,
    publicationId,
    input,
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
