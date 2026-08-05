'use client';

import { useTransition } from 'react';
import { Button } from '@vl6/ui';
import { toggleLibraryFavoriteAction } from '../actions/library-actions';

export function FavoriteButton({
  libraryItemId,
  favorited,
}: {
  libraryItemId: string;
  favorited: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={favorited ? 'accent' : 'outline'}
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => toggleLibraryFavoriteAction(libraryItemId))}
    >
      {favorited ? '★ Favorito' : '☆ Favoritar'}
    </Button>
  );
}
