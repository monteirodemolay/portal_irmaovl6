import Link from 'next/link';
import { ArrowLeft } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ModerateCommentsPanel } from '@/modules/content/components/moderate-comments-panel';
import { resolveCommentAuthorNames } from '@/modules/content/lib/resolve-comment-authors';

/**
 * Fila única de moderação de comentários de Notícias, juntando todas as
 * notícias do tenant — existia antes só dentro da tela de edição de cada
 * notícia individualmente, o que exigia abrir Notícia por Notícia pra achar
 * o que estava pendente. Acessível pelo atalho no Painel de gestão e pelo
 * link de cada notificação de "novo comentário".
 */
export default async function NewsCommentsModerationPage() {
  const session = await requirePagePermission('news:manage');
  const container = createServerContainer();

  const pendingComments = await container.useCases.listPendingNewsComments.execute(
    session.authContext,
  );

  const [authorNames, newsTitles] = await Promise.all([
    resolveCommentAuthorNames(container, session.authContext.tenantId, pendingComments),
    (async () => {
      const uniqueNewsIds = Array.from(new Set(pendingComments.map((comment) => comment.newsId)));
      const entries = await Promise.all(
        uniqueNewsIds.map(async (newsId) => {
          const news = await container.repositories.news.findById(newsId);
          return [newsId, news?.titulo ?? '(Notícia removida)'] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, string>;
    })(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/conteudo/noticias"
          className="text-muted hover:text-foreground mb-2 flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Notícias
        </Link>
        <h1 className="font-display text-2xl font-semibold">Comentários pendentes de moderação</h1>
        <p className="text-muted">
          Todas as notícias juntas — aprove ou rejeite sem precisar abrir uma a uma.
        </p>
      </div>

      <ModerateCommentsPanel
        comments={pendingComments}
        authorNames={authorNames}
        newsTitles={newsTitles}
      />
    </div>
  );
}
