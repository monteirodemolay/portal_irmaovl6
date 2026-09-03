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
import type { NotificationPriority } from '@vl6/shared';
import type { AnnouncementPriority } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { notifyAllActiveUsers } from '@/modules/notification/lib/notify-all-active-users';
import { scrapeNewsMetadata } from '@/lib/content/scrape-news-metadata';

const ANNOUNCEMENT_PRIORITY_TO_NOTIFICATION_PRIORITY: Record<
  AnnouncementPriority,
  NotificationPriority
> = {
  baixa: 'normal',
  media: 'attention',
  alta: 'urgent',
};

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ImportNewsResult {
  ok: boolean;
  url: string;
  titulo: string | null;
  newsId: string | null;
  error: string | null;
}

/**
 * Importa uma not\u00edcia do site institucional (vl6.com.br) como rascunho,
 * a partir do link de uma not\u00edcia j\u00e1 publicada l\u00e1 \u2014 busca a p\u00e1gina no
 * servidor e l\u00ea os metadados Open Graph que o Wix j\u00e1 emite pra
 * pr\u00e9-visualiza\u00e7\u00e3o em redes sociais (t\u00edtulo, resumo, imagem de capa), sem
 * precisar de um scraper espec\u00edfico pra estrutura do site. Sempre entra
 * como rascunho (`CreateNewsUseCase`): o Administrador revisa e completa o
 * conte\u00fado antes de publicar \u2014 o resumo importado nunca \u00e9 o texto
 * completo da not\u00edcia original, s\u00f3 o que o Open Graph exp\u00f5e.
 */
export async function importNewsFromUrlAction(url: string): Promise<ImportNewsResult> {
  const session = await requireSession();

  const scraped = await scrapeNewsMetadata(url);
  if (!scraped.ok) {
    return { ok: false, url, titulo: null, newsId: null, error: scraped.error };
  }

  const container = createServerContainer();
  const baseSlug = slugify(scraped.title) || 'noticia';
  const sourceNote = `<p><em>Importado de <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>. Revise e complete o conte\u00fado antes de publicar.</em></p>`;
  const conteudoHtml = scraped.description
    ? `<p>${escapeHtml(scraped.description)}</p>\n${sourceNote}`
    : sourceNote;

  let imagemCapaUrl: string | null = null;
  if (scraped.image) {
    try {
      imagemCapaUrl = new URL(scraped.image).toString();
    } catch {
      imagemCapaUrl = null;
    }
  }

  // At\u00e9 2 tentativas: slug puro e, se j\u00e1 existir (outra not\u00edcia com t\u00edtulo
  // igual/parecido), com um sufixo curto \u2014 mesmo esp\u00edrito do sufixo
  // num\u00e9rico que outros cadastros do Portal usam pra evitar colis\u00e3o sem
  // precisar perguntar nada ao Administrador nesse fluxo em lote.
  for (const slug of [baseSlug, `${baseSlug}-${Date.now().toString(36).slice(-4)}`]) {
    let input: NewsFormValues;
    try {
      input = newsSchema.parse({
        titulo: scraped.title,
        subtitulo: null,
        slug,
        imagemCapaUrl,
        conteudoHtml,
        categoria: 'Not\u00edcias VL6',
      });
    } catch {
      return {
        ok: false,
        url,
        titulo: scraped.title,
        newsId: null,
        error: 'N\u00e3o foi poss\u00edvel montar a not\u00edcia a partir dessa p\u00e1gina.',
      };
    }

    const result = await container.useCases.createNews.execute(session.authContext, input);
    if (result.ok) {
      revalidatePath('/admin/conteudo/noticias');
      return { ok: true, url, titulo: result.value.titulo, newsId: result.value.id, error: null };
    }
    if (result.error.code !== 'conflict') {
      return { ok: false, url, titulo: scraped.title, newsId: null, error: result.error.message };
    }
  }

  return {
    ok: false,
    url,
    titulo: scraped.title,
    newsId: null,
    error: 'J\u00e1 existe uma not\u00edcia com esse t\u00edtulo importada.',
  };
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
      requiresAcknowledgement: formData.get('requiresAcknowledgement') === 'on',
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
      requiresAcknowledgement: formData.get('requiresAcknowledgement') === 'on',
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

  if (publicar) {
    // `dedupeKey` por destinatário no formato `announcement:{id}:user:{uid}`
    // — além de idempotência, é a chave que o relatório de alcance
    // (`getAnnouncementReachReportAction`) usa pra encontrar todas as
    // notificações nascidas desta publicação.
    await notifyAllActiveUsers(container, session.authContext.tenantId, {
      tipo: 'announcement',
      titulo: result.value.titulo,
      mensagem: result.value.descricao,
      link: '/avisos',
      priority: ANNOUNCEMENT_PRIORITY_TO_NOTIFICATION_PRIORITY[result.value.prioridade],
      expiresAt: result.value.dataExpiracao,
      requiresAcknowledgement: result.value.requiresAcknowledgement,
      actionLabel: result.value.requiresAcknowledgement ? 'Estou ciente' : undefined,
      dedupeKey: (userId) => `announcement:${announcementId}:user:${userId}`,
    });
  }

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
