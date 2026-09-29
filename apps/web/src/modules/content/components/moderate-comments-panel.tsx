'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { NewsComment } from '@vl6/domain';
import { Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { moderateNewsCommentAction } from '../actions/content-actions';

export function ModerateCommentsPanel({
  comments,
  authorNames,
  newsTitles,
}: {
  comments: NewsComment[];
  authorNames: Record<string, string>;
  /** Título da notícia por `newsId` — só informado na fila global (dashboard/atalho), que mistura comentários de várias notícias. Numa tela já dentro de uma notícia específica, o título é redundante. */
  newsTitles?: Record<string, string>;
}) {
  if (comments.length === 0) {
    return <EmptyState title="Nenhum comentário aguardando moderação" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          authorName={authorNames[comment.autorId] ?? 'Irmão'}
          newsTitle={newsTitles?.[comment.newsId]}
        />
      ))}
    </div>
  );
}

function CommentRow({
  comment,
  authorName,
  newsTitle,
}: {
  comment: NewsComment;
  authorName: string;
  newsTitle?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          {newsTitle && (
            <Link
              href={`/admin/conteudo/noticias/${comment.newsId}`}
              className="text-accent mb-0.5 block truncate text-xs font-semibold hover:underline"
            >
              {newsTitle}
            </Link>
          )}
          <p className="text-sm font-semibold">{authorName}</p>
          <p className="text-sm">{comment.texto}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="accent"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => moderateNewsCommentAction(comment.newsId, comment.id, true))
            }
          >
            Aprovar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => moderateNewsCommentAction(comment.newsId, comment.id, false))
            }
          >
            Rejeitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
