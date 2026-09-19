'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { restoreLibraryItemAction } from '../actions/library-actions';

export function RestoreLibraryItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end gap-1 text-right">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await restoreLibraryItemAction(itemId);
            if (result.error) setError(result.error);
          })
        }
      >
        {pending ? 'Restaurando…' : 'Restaurar'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
