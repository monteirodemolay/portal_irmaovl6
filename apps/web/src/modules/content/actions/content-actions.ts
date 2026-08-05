'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  announcementSchema,
  newsSchema,
  type AnnouncementFormValues,
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

  revalidatePath('/admin/noticias');
  redirect(`/admin/noticias/${result.value.id}`);
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

  revalidatePath('/admin/noticias');
  revalidatePath(`/admin/noticias/${newsId}`);
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

  revalidatePath('/admin/noticias');
  revalidatePath(`/admin/noticias/${newsId}`);
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

  revalidatePath('/admin/avisos');
  redirect('/admin/avisos');
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

  revalidatePath('/admin/avisos');
}
