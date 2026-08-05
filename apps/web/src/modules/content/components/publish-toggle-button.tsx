'use client';

import { useTransition } from 'react';
import { Button } from '@vl6/ui';

export function PublishToggleButton({
  published,
  onToggle,
}: {
  published: boolean;
  onToggle: (next: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={published ? 'outline' : 'accent'}
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => onToggle(!published))}
    >
      {isPending ? 'Atualizando…' : published ? 'Despublicar' : 'Publicar'}
    </Button>
  );
}
