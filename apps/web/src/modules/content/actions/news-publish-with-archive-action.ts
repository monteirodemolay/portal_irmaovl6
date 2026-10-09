'use server';

import { createServerContainer } from '@vl6/infra';
import { logger } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import { reconcileOnePublishedNewsArchive } from '@/lib/content/reconcile-news-archive';
import { toggleNewsPublishedAction } from './content-actions';

/**
 * Publicação editorial + reconciliação histórica numa única ação.
 * Se o Acervo falhar, a notícia continua com o estado editorial que já foi
 * gravado e o reconciliador diário tentará novamente; nunca escondemos uma
 * matéria publicada por indisponibilidade transitória de mídia.
 */
export async function toggleNewsPublishedWithArchiveAction(
  newsId: string,
  publicar: boolean,
): Promise<void> {
  await toggleNewsPublishedAction(newsId, publicar);
  if (!publicar) return;

  const session = await requireSession();
  const container = createServerContainer();
  const news = await container.repositories.news.findById(newsId);
  if (!news || news.tenantId !== session.authContext.tenantId || news.deletedAt || !news.publicado) {
    return;
  }

  const reconciliation = await reconcileOnePublishedNewsArchive(
    container,
    session.authContext,
    news,
  );

  if (reconciliation.status === 'error') {
    logger.error('Notícia publicada, mas reconciliação com Acervo ficou pendente', {
      route: 'toggleNewsPublishedWithArchiveAction',
      newsId,
      errors: reconciliation.errors,
    });
  } else if (reconciliation.status === 'unresolved') {
    logger.info('Notícia publicada sem Evento inequívoco; aguardando vínculo histórico', {
      route: 'toggleNewsPublishedWithArchiveAction',
      newsId,
    });
  }
}
