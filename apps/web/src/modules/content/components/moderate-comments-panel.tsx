'use client';

import { useTransition } from 'react';
import type { NewsComment } from '@vl6/domain';
import { Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { moderateNewsCommentAction } from '../actions/content-actions';

export function ModerateCommentsPanel({
  newsId,
  comments,
}: {
  newsId: string;
  comments: NewsComment[];
}) {
  if (comments.length === 0) {
    return <EmptyState title="Nenhum comentário aguardando moderação" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentRow key={comment.id} newsId={newsId} comment={comment} />
      ))}
    </div>
  );
}

function CommentRow({ newsId, comment }: { newsId: string; comment: NewsComment }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <p className="text-sm">{comment.texto}</p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="accent"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => moderateNewsCommentAction(newsId, comment.id, true))
            }
          >
            Aprovar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => moderateNewsCommentAction(newsId, comment.id, false))
            }
          >
            Rejeitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
