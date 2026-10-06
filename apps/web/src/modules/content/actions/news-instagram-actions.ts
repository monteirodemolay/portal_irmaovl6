'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { newsSchema } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';

function parseInstagramUrls(value: FormDataEntryValue | null): string[] {
  const seen = new Set<string>();
  return String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

/**
 * Mantém os links externos da notícia separados do HTML editorial.
 * O Evento não duplica esse dado: ele o lê das notícias relacionadas,
 * preservando uma única fonte de verdade para cada publicação externa.
 */
export async function updateNewsInstagramLinksAction(
  newsId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const current = await container.repositories.news.findById(newsId);

  if (!current || current.tenantId !== session.authContext.tenantId || current.deletedAt) {
    throw new Error('Notícia não encontrada.');
  }

  const instagramUrls = parseInstagramUrls(formData.get('instagramUrls'));
  const parsed = newsSchema.safeParse({
    titulo: current.titulo,
    subtitulo: current.subtitulo,
    slug: current.slug,
    imagemCapaUrl: current.imagemCapaUrl,
    conteudoHtml: current.conteudoHtml,
    categoria: current.categoria,
    destaque: Boolean(current.destaque),
    destaquePrincipal: Boolean(current.destaquePrincipal),
    eventId: current.eventId ?? null,
    instagramUrls,
    dataPublicacao: current.dataPublicacao,
  });

  if (!parsed.success) {
    throw new Error('Informe somente links válidos do Instagram, um por linha (máximo de 10).');
  }

  const result = await container.useCases.updateNews.execute(
    session.authContext,
    newsId,
    parsed.data,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath(`/admin/conteudo/noticias/${newsId}`);
  revalidatePath(`/noticias/${result.value.slug}`);
  revalidatePath('/noticias');
  revalidatePath('/noticias/todas');
  if (result.value.eventId) {
    revalidatePath(`/acervo/eventos/${result.value.eventId}`);
    revalidatePath('/acervo/linha-do-tempo');
  }
}
