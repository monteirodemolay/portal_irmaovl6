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
import type { AnnouncementPriority, News } from '@vl6/domain';
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
 * servidor e extrai os metadados editoriais, o corpo completo e as imagens
 * da publicação. A rotina prioriza JSON-LD e usa o HTML renderizado como
 * fallback. Sempre entra como rascunho (`CreateNewsUseCase`) para revisão
 * antes da publicação no Portal.
 */
export async function importNewsFromUrlAction(url: string): Promise<ImportNewsResult> {
  const session = await requireSession();

  const scraped = await scrapeNewsMetadata(url);
  if (!scraped.ok) {
    return { ok: false, url, titulo: null, newsId: null, error: scraped.error };
  }

  const container = createServerContainer();
  const baseSlug = slugify(scraped.title) || 'noticia';
  const sourceNote = `<p><em>Fonte original: <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>.</em></p>`;
  const conteudoHtml = `${scraped.contentHtml}\n${sourceNote}`;

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
        destaque: false,
        destaquePrincipal: false,
        dataPublicacao: scraped.publishedAt,
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

const IMPORTED_FROM_URL_REGEX = /(?:Importado de|Fonte original:)\s*<a href="([^"]+)"/;

export interface BackfillNewsPublishedDateResult {
  newsId: string;
  titulo: string;
  ok: boolean;
  dataAnterior: Date | null;
  dataNova: Date | null;
  error: string | null;
}

export interface ReimportImportedNewsResult {
  newsId: string;
  titulo: string;
  url: string | null;
  ok: boolean;
  error: string | null;
}

/**
 * Reimporta, em lote, todas as notícias que possuem vínculo com uma matéria
 * original de vl6.com.br. Mantém o ID, slug, status de publicação, categoria
 * e hierarquia editorial já existentes, mas atualiza título, subtítulo, capa,
 * corpo completo, imagens e data original com o conteúdo atual da fonte.
 *
 * O link da fonte é sempre preservado de forma integral no rodapé da matéria.
 */
export async function reimportImportedNewsAction(): Promise<ReimportImportedNewsResult[]> {
  const session = await requireSession();
  const container = createServerContainer();
  const page = await container.useCases.listAllNews.execute(session.authContext, { limit: 500 });
  const results: ReimportImportedNewsResult[] = [];

  for (const news of page.items) {
    const match = news.conteudoHtml.match(IMPORTED_FROM_URL_REGEX);
    if (!match?.[1]) continue;

    const url = match[1].replace(/&amp;/g, '&');
    const scraped = await scrapeNewsMetadata(url);

    if (!scraped.ok) {
      results.push({
        newsId: news.id,
        titulo: news.titulo,
        url,
        ok: false,
        error: scraped.error,
      });
      continue;
    }

    let imagemCapaUrl: string | null = news.imagemCapaUrl;
    if (scraped.image) {
      try {
        imagemCapaUrl = new URL(scraped.image).toString();
      } catch {
        imagemCapaUrl = news.imagemCapaUrl;
      }
    }

    const sourceNote = `<p><em>Fonte original: <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>.</em></p>`;

    try {
      const input = newsSchema.parse({
        titulo: scraped.title,
        subtitulo: scraped.description?.trim() || null,
        slug: news.slug,
        imagemCapaUrl,
        conteudoHtml: `${scraped.contentHtml}\n${sourceNote}`,
        categoria: news.categoria,
        destaque: Boolean(news.destaque),
        destaquePrincipal: Boolean(news.destaquePrincipal),
        dataPublicacao: scraped.publishedAt ?? news.dataPublicacao,
      });

      const result = await container.useCases.updateNews.execute(session.authContext, news.id, input);

      results.push({
        newsId: news.id,
        titulo: result.ok ? result.value.titulo : news.titulo,
        url,
        ok: result.ok,
        error: result.ok ? null : result.error.message,
      });
    } catch (error) {
      results.push({
        newsId: news.id,
        titulo: news.titulo,
        url,
        ok: false,
        error: error instanceof Error ? error.message : 'Falha ao validar os dados importados.',
      });
    }
  }

  if (results.some((item) => item.ok)) {
    revalidatePath('/admin/conteudo/noticias');
    revalidatePath('/noticias');
    revalidatePath('/dashboard');
  }

  return results;
}


/**
 * Corrige retroativamente a `dataPublicacao` de not\u00edcias importadas do site
 * VL6 antes deste campo existir \u2014 na \u00e9poca, `CreateNewsUseCase` sempre
 * gravava `null` e `PublishNewsUseCase` carimbava "agora" ao publicar, ent\u00e3o
 * toda not\u00edcia importada mostrava a data em que entrou no Portal, n\u00e3o a
 * data real de veicula\u00e7\u00e3o no site original.
 *
 * Identifica as not\u00edcias importadas pelo link que `importNewsFromUrlAction`
 * sempre grava no rodap\u00e9 do conte\u00fado ("Importado de <a href=...>"), busca
 * cada p\u00e1gina de novo e, quando a p\u00e1gina emite `article:published_time`,
 * atualiza a data. Not\u00edcias criadas manualmente (sem esse link) n\u00e3o s\u00e3o
 * tocadas; not\u00edcias importadas cuja p\u00e1gina de origem n\u00e3o emite a tag tamb\u00e9m
 * ficam como est\u00e3o (nada para corrigir automaticamente).
 */
export async function backfillNewsPublishedDatesAction(): Promise<
  BackfillNewsPublishedDateResult[]
> {
  const session = await requireSession();
  const container = createServerContainer();

  const page = await container.useCases.listAllNews.execute(session.authContext, { limit: 500 });
  const results: BackfillNewsPublishedDateResult[] = [];

  for (const news of page.items) {
    const match = news.conteudoHtml.match(IMPORTED_FROM_URL_REGEX);
    if (!match) continue;
    const url = match[1]!.replace(/&amp;/g, '&');

    const scraped = await scrapeNewsMetadata(url);
    if (!scraped.ok || !scraped.publishedAt) continue;
    if (news.dataPublicacao && news.dataPublicacao.getTime() === scraped.publishedAt.getTime()) {
      continue;
    }

    const input = newsSchema.parse({
      titulo: news.titulo,
      subtitulo: news.subtitulo,
      slug: news.slug,
      imagemCapaUrl: news.imagemCapaUrl,
      conteudoHtml: news.conteudoHtml,
      categoria: news.categoria,
      destaque: Boolean(news.destaque),
      destaquePrincipal: Boolean(news.destaquePrincipal),
      dataPublicacao: scraped.publishedAt,
    });
    const result = await container.useCases.updateNews.execute(session.authContext, news.id, input);
    results.push({
      newsId: news.id,
      titulo: news.titulo,
      ok: result.ok,
      dataAnterior: news.dataPublicacao,
      dataNova: scraped.publishedAt,
      error: result.ok ? null : result.error.message,
    });
  }

  if (results.some((r) => r.ok)) {
    revalidatePath('/admin/conteudo/noticias');
    revalidatePath('/noticias');
  }

  return results;
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
      destaque: formData.get('destaque') === 'on' || formData.get('destaquePrincipal') === 'on',
      destaquePrincipal: formData.get('destaquePrincipal') === 'on',
      dataPublicacao: formData.get('dataPublicacao') || null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createNews.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  if (result.value.destaquePrincipal) {
    await enforceSinglePrimaryHighlight(container, session.authContext, result.value.id);
  }

  revalidatePath('/admin/conteudo/noticias');
  revalidatePath('/noticias');
  revalidatePath('/dashboard');
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
      destaque: formData.get('destaque') === 'on' || formData.get('destaquePrincipal') === 'on',
      destaquePrincipal: formData.get('destaquePrincipal') === 'on',
      dataPublicacao: formData.get('dataPublicacao') || null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateNews.execute(session.authContext, newsId, input);
  if (!result.ok) return { error: result.error.message };

  if (result.value.destaquePrincipal) {
    await enforceSinglePrimaryHighlight(container, session.authContext, result.value.id);
  }

  revalidatePath('/admin/conteudo/noticias');
  revalidatePath(`/admin/conteudo/noticias/${newsId}`);
  revalidatePath('/noticias');
  revalidatePath('/dashboard');
  return { error: null };
}

function newsToFormInput(news: News): NewsFormValues {
  return {
    titulo: news.titulo,
    subtitulo: news.subtitulo,
    slug: news.slug,
    imagemCapaUrl: news.imagemCapaUrl,
    conteudoHtml: news.conteudoHtml,
    categoria: news.categoria,
    destaque: Boolean(news.destaque),
    destaquePrincipal: Boolean(news.destaquePrincipal),
    dataPublicacao: news.dataPublicacao,
  };
}

async function enforceSinglePrimaryHighlight(
  container: ReturnType<typeof createServerContainer>,
  authContext: Awaited<ReturnType<typeof requireSession>>['authContext'],
  primaryId: string,
): Promise<void> {
  const page = await container.useCases.listAllNews.execute(authContext, { limit: 500 });
  for (const item of page.items) {
    if (item.id === primaryId || !item.destaquePrincipal) continue;
    await container.useCases.updateNews.execute(authContext, item.id, {
      ...newsToFormInput(item),
      destaquePrincipal: false,
    });
  }
}

export async function toggleNewsFeaturedAction(newsId: string, destacar: boolean): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const current = await container.repositories.news.findById(newsId);
  if (!current || current.tenantId !== session.authContext.tenantId) {
    throw new Error('Notícia não encontrada.');
  }

  const result = await container.useCases.updateNews.execute(session.authContext, newsId, {
    ...newsToFormInput(current),
    destaque: destacar,
    destaquePrincipal: destacar ? Boolean(current.destaquePrincipal) : false,
  });
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/conteudo/noticias');
  revalidatePath('/noticias');
  revalidatePath('/dashboard');
}

export async function setNewsPrimaryHighlightAction(newsId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const current = await container.repositories.news.findById(newsId);
  if (!current || current.tenantId !== session.authContext.tenantId) {
    throw new Error('Notícia não encontrada.');
  }

  const result = await container.useCases.updateNews.execute(session.authContext, newsId, {
    ...newsToFormInput(current),
    destaque: true,
    destaquePrincipal: true,
  });
  if (!result.ok) throw new Error(result.error.message);

  await enforceSinglePrimaryHighlight(container, session.authContext, newsId);
  revalidatePath('/admin/conteudo/noticias');
  revalidatePath('/noticias');
  revalidatePath('/dashboard');
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
