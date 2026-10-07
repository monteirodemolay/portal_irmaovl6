'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { announcementSchema, newsSchema } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import {
  toggleAnnouncementPublishedAction,
  toggleNewsPublishedAction,
  type ContentActionState,
} from '@/modules/content/actions/content-actions';
import { syncNewsMediaToArchive } from '@/lib/content/sync-news-media-to-archive';
import { updateNewsInstagramLinksAction } from '@/modules/content/actions/news-instagram-actions';

export async function saveWorkspaceInstagramLinksAction(
  eventId: string,
  newsId: string,
  _state: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const { authContext: ctx } = await requireSession();
  requirePermission(ctx, 'event:read');
  requirePermission(ctx, 'news:update');
  const c = createServerContainer();
  const [event, news] = await Promise.all([
    c.repositories.event.findById(eventId),
    c.repositories.news.findById(newsId),
  ]);
  if (
    !event ||
    event.tenantId !== ctx.tenantId ||
    event.deletedAt ||
    !news ||
    news.tenantId !== ctx.tenantId ||
    news.deletedAt ||
    news.eventId !== eventId
  )
    return { error: 'Notícia não vinculada a este acontecimento.' };
  try {
    await updateNewsInstagramLinksAction(newsId, formData);
  } catch {
    return {
      error: 'Não foi possível salvar. Confira os links do Instagram (um por linha, máximo de 10).',
    };
  }
  revalidatePath(`/admin/publicacoes/${eventId}`);
  return { error: null, success: 'Links externos salvos.' };
}

export async function createWorkspaceArtAction(
  eventId: string,
  _state: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const { authContext: ctx } = await requireSession();
  requirePermission(ctx, 'event:read');
  requirePermission(ctx, 'communication:manage');
  const c = createServerContainer();
  const event = await c.repositories.event.findById(eventId);
  if (!event || event.tenantId !== ctx.tenantId || event.deletedAt)
    return { error: 'Acontecimento não encontrado.' };
  const templateId = String(formData.get('templateId') ?? '');
  const template = await c.repositories.artTemplate.findById(templateId);
  if (
    !template ||
    template.tenantId !== ctx.tenantId ||
    !template.active ||
    template.type !== 'session'
  )
    return { error: 'Selecione um modelo ativo de sessão da Loja.' };
  const result = await c.useCases.createPublicationFromEvent.execute(ctx, eventId, templateId);
  if (!result.ok) return { error: result.error.message };
  revalidatePath(`/admin/publicacoes/${eventId}`);
  revalidatePath('/admin/comunicacao');
  return { error: null, success: 'Arte preparada. Continue a edição abaixo.' };
}

export async function linkWorkspaceContentAction(
  eventId: string,
  kind: 'news' | 'announcement',
  _state: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const session = await requireSession(),
    ctx = session.authContext;
  requirePermission(ctx, 'event:read');
  if (kind !== 'news' && kind !== 'announcement') return { error: 'Tipo de conteúdo inválido.' };
  requirePermission(ctx, `${kind}:update`);
  requirePermission(ctx, `${kind}:read`);
  const c = createServerContainer();
  const event = await c.repositories.event.findById(eventId);
  if (!event || event.tenantId !== ctx.tenantId || event.deletedAt)
    return { error: 'Acontecimento não encontrado.' };
  const id = String(formData.get('contentId') ?? '');
  if (kind === 'news') {
    const current = await c.repositories.news.findById(id);
    if (!current || current.tenantId !== ctx.tenantId || current.deletedAt)
      return { error: 'Notícia não encontrada.' };
    if (current.eventId && current.eventId !== eventId)
      return { error: 'A notícia já está vinculada a outro acontecimento.' };
    const result = await c.useCases.updateNews.execute(
      ctx,
      id,
      newsSchema.parse({ ...current, eventId }),
    );
    if (!result.ok) return { error: result.error.message };
    await syncNewsMediaToArchive({
      container: c,
      authContext: ctx,
      news: result.value,
      sourceUrl: null,
    });
    revalidatePath(`/admin/conteudo/noticias/${id}`);
  } else {
    const current = await c.repositories.announcement.findById(id);
    if (!current || current.tenantId !== ctx.tenantId || current.deletedAt)
      return { error: 'Aviso não encontrado.' };
    if (current.eventId && current.eventId !== eventId)
      return { error: 'O aviso já está vinculado a outro acontecimento.' };
    const result = await c.useCases.updateAnnouncement.execute(
      ctx,
      id,
      announcementSchema.parse({ ...current, eventId }),
    );
    if (!result.ok) return { error: result.error.message };
    revalidatePath(`/admin/conteudo/avisos/${id}`);
  }
  revalidatePath(`/admin/publicacoes/${eventId}`);
  revalidatePath('/admin/publicacoes');
  revalidatePath(`/acervo/eventos/${eventId}`);
  return { error: null, success: 'Conteúdo vinculado. Você pode editá-lo abaixo.' };
}

/** A publicação reutiliza as regras e notificações existentes e permanece no espaço único. */
export async function setWorkspacePublicationAction(
  eventId: string,
  kind: 'news' | 'announcement',
  id: string,
  published: boolean,
): Promise<ContentActionState> {
  const session = await requireSession(),
    ctx = session.authContext;
  requirePermission(ctx, 'event:read');
  if (kind !== 'news' && kind !== 'announcement') return { error: 'Tipo de conteúdo inválido.' };
  requirePermission(ctx, `${kind}:publish`);
  const c = createServerContainer();
  const event = await c.repositories.event.findById(eventId);
  if (!event || event.tenantId !== ctx.tenantId || event.deletedAt)
    return { error: 'Acontecimento não encontrado.' };
  const current =
    kind === 'news'
      ? await c.repositories.news.findById(id)
      : await c.repositories.announcement.findById(id);
  if (
    !current ||
    current.tenantId !== ctx.tenantId ||
    current.eventId !== eventId ||
    current.deletedAt
  )
    return { error: 'Conteúdo não vinculado a este acontecimento.' };
  try {
    if (kind === 'news') await toggleNewsPublishedAction(id, published);
    else await toggleAnnouncementPublishedAction(id, published);
  } catch {
    // A publicação pode ter sido persistida antes de falhar uma notificação.
    // Recarregar exibe o estado real; não anunciamos sucesso do fluxo completo.
    revalidatePath(`/admin/publicacoes/${eventId}`);
    return {
      error:
        'Não foi possível concluir a operação. Confira a situação atual antes de tentar novamente.',
    };
  }
  revalidatePath(`/admin/publicacoes/${eventId}`);
  revalidatePath('/admin/publicacoes');
  return { error: null, success: published ? 'Publicado no Portal.' : 'Retornado para rascunho.' };
}
