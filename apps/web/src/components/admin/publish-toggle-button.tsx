'use client';

import { useTransition } from 'react';
import { Button } from '@vl6/ui';

export function PublishToggleButton({
  published,
  onToggle,
  labels = { on: 'Publicar', off: 'Despublicar' },
}: {
  published: boolean;
  onToggle: (next: boolean) => Promise<void>;
  labels?: { on: string; off: string };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={published ? 'outline' : 'accent'}
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => onToggle(!published))}
    >
      {isPending ? 'Atualizando…' : published ? labels.off : labels.on}
    </Button>
  );
}
