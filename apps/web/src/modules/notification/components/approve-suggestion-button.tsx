'use client';

import { useTransition } from 'react';
import { Button } from '@vl6/ui';
import { approveLinkSuggestionAction } from '../actions/link-admin-actions';

export function ApproveSuggestionButton({ suggestionId }: { suggestionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => approveLinkSuggestionAction(suggestionId))}
    >
      {isPending ? 'Aprovando…' : 'Aprovar'}
    </Button>
  );
}
