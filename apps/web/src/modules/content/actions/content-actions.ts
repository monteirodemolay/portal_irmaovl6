'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  announcementSchema,
  inspirationalQuoteSchema,
  newsCommentSchema,
  newsSchema,
  quoteRotationSchema,
  type AnnouncementFormValues,
  type InspirationalQuoteFormValues,
  type NewsFormValues,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface ContentActionState {
  error: string | null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createNewsAction(
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  let input: NewsFormValues;
  try {
    input = newsSchema.parse({
      titulo: formData.get('titulo'),
      subtitulo: formData.get('subtitulo') || null,
      slug: slugify(String(formData.get('slug') || formData.get('titulo') || '')),
      imagemCapaUrl: formData.get('imagemCapaUrl') || null,
      conteudoHtml: formData.get('conteudoHtml'),
      categoria: formData.get('categoria'),
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createNews.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/noticias');
  redirect(`/admin/conteudo/noticias/${result.value.id}`);
}

export async function updateNewsAction(
  newsId: string,
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  let input: NewsFormValues;
  try {
    input = newsSchema.parse({
      titulo: formData.get('titulo'),
      subtitulo: formData.get('subtitulo') || null,
      slug: slugify(String(formData.get('slug') || '')),
      imagemCapaUrl: formData.get('imagemCapaUrl') || null,
      conteudoHtml: formData.get('conteudoHtml'),
      categoria: formData.get('categoria'),
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateNews.execute(session.authContext, newsId, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/noticias');
  revalidatePath(`/admin/conteudo/noticias/${newsId}`);
  return { error: null };
}

export async function toggleNewsPublishedAction(newsId: string, publicar: boolean): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishNews.execute(
    session.authContext,
    newsId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/noticias');
  revalidatePath(`/admin/conteudo/noticias/${newsId}`);
}

export async function deleteNewsAction(newsId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deleteNews.execute(session.authContext, newsId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/noticias');
}

export async function hardDeleteNewsAction(newsId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.hardDeleteNews.execute(session.authContext, newsId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/noticias');
}

export async function createAnnouncementAction(
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  const dataExpiracao = formData.get('dataExpiracao');
  let input: AnnouncementFormValues;
  try {
    input = announcementSchema.parse({
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao'),
      prioridade: formData.get('prioridade'),
      destacar: formData.get('destacar') === 'on',
      dataExpiracao: dataExpiracao ? dataExpiracao : null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createAnnouncement.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/avisos');
  redirect('/admin/conteudo/avisos');
}

export async function updateAnnouncementAction(
  announcementId: string,
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  const dataExpiracao = formData.get('dataExpiracao');
  let input: AnnouncementFormValues;
  try {
    input = announcementSchema.parse({
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao'),
      prioridade: formData.get('prioridade'),
      destacar: formData.get('destacar') === 'on',
      dataExpiracao: dataExpiracao ? dataExpiracao : null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateAnnouncement.execute(
    session.authContext,
    announcementId,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/avisos');
  revalidatePath(`/admin/conteudo/avisos/${announcementId}`);
  return { error: null };
}

export async function deleteAnnouncementAction(announcementId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deleteAnnouncement.execute(
    session.authContext,
    announcementId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/avisos');
}

export async function hardDeleteAnnouncementAction(announcementId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.hardDeleteAnnouncement.execute(
    session.authContext,
    announcementId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/avisos');
}

export async function toggleAnnouncementPublishedAction(
  announcementId: string,
  publicar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishAnnouncement.execute(
    session.authContext,
    announcementId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/avisos');
}

export async function createNewsCommentAction(
  newsId: string,
  slug: string,
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  let input;
  try {
    input = newsCommentSchema.parse({ texto: formData.get('texto') });
  } catch {
    return { error: 'Escreva um comentário antes de enviar.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createNewsComment.execute(
    session.authContext,
    newsId,
    input.texto,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/noticias/${slug}`);
  return { error: null };
}

export async function createInspirationalQuoteAction(
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  let input: InspirationalQuoteFormValues;
  try {
    input = inspirationalQuoteSchema.parse({
      texto: formData.get('texto'),
      autor: formData.get('autor'),
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createInspirationalQuote.execute(
    session.authContext,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/frases');
  revalidatePath('/dashboard');
  redirect('/admin/conteudo/frases');
}

export async function updateInspirationalQuoteAction(
  quoteId: string,
  _prevState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession();

  let input: InspirationalQuoteFormValues;
  try {
    input = inspirationalQuoteSchema.parse({
      texto: formData.get('texto'),
      autor: formData.get('autor'),
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateInspirationalQuote.execute(
    session.authContext,
    quoteId,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/conteudo/frases');
  revalidatePath('/dashboard');
  return { error: null };
}

export async function deleteInspirationalQuoteAction(quoteId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deleteInspirationalQuote.execute(
    session.authContext,
    quoteId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/frases');
}

export async function hardDeleteInspirationalQuoteAction(quoteId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.hardDeleteInspirationalQuote.execute(
    session.authContext,
    quoteId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/frases');
}

export async function toggleInspirationalQuoteActiveAction(
  quoteId: string,
  ativa: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.toggleInspirationalQuoteActive.execute(
    session.authContext,
    quoteId,
    ativa,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/frases');
  revalidatePath('/dashboard');
}

export interface QuoteRotationActionState {
  error: string | null;
  success: boolean;
}

export async function updateQuoteRotationAction(
  _prevState: QuoteRotationActionState,
  formData: FormData,
): Promise<QuoteRotationActionState> {
  const session = await requireSession();

  const intervaloMinutosRaw = formData.get('intervaloMinutos');
  let input;
  try {
    input = quoteRotationSchema.parse({
      modo: formData.get('modo'),
      intervaloMinutos: intervaloMinutosRaw ? intervaloMinutosRaw : null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.', success: false };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateTenantSettings.execute(session.authContext, {
    citacaoRotacao: {
      modo: input.modo,
      intervaloMinutos: input.modo === 'intervalo' ? input.intervaloMinutos : null,
    },
  });
  if (!result.ok) return { error: result.error.message, success: false };

  revalidatePath('/admin/conteudo/frases');
  revalidatePath('/dashboard');
  return { error: null, success: true };
}

export async function moderateNewsCommentAction(
  newsId: string,
  commentId: string,
  aprovar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.moderateNewsComment.execute(
    session.authContext,
    commentId,
    aprovar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath(`/admin/conteudo/noticias/${newsId}`);
  revalidatePath(`/noticias`);
}
