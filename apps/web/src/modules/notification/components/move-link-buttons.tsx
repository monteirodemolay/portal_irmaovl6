'use client';

import { useTransition } from 'react';
import { ChevronDown, ChevronUp } from '@vl6/ui';
import { moveLinkAction } from '../actions/link-admin-actions';

/** Botões ▲▼ — troca a `ordem` deste Link com o vizinho imediato (`MoveLinkUseCase`). */
export function MoveLinkButtons({
  linkId,
  disableUp,
  disableDown,
}: {
  linkId: string;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-label="Mover para cima"
        disabled={isPending || disableUp}
        onClick={() => startTransition(() => moveLinkAction(linkId, 'up'))}
        className="text-muted hover:text-accent disabled:opacity-30"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        aria-label="Mover para baixo"
        disabled={isPending || disableDown}
        onClick={() => startTransition(() => moveLinkAction(linkId, 'down'))}
        className="text-muted hover:text-accent disabled:opacity-30"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
