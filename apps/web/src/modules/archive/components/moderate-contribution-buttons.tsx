'use client';

import { useState, useTransition } from 'react';
import { Button, Input } from '@vl6/ui';
import { moderateArchiveContributionAction } from '../actions/archive-contribution-actions';

export function ModerateContributionButtons({ contributionId }: { contributionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [motivo, setMotivo] = useState('');

  if (rejecting) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Motivo da rejeição"
          className="h-8 w-48 text-xs"
        />
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending || motivo.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              await moderateArchiveContributionAction(contributionId, false, motivo.trim());
              setRejecting(false);
            })
          }
        >
          Confirmar
        </Button>
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setRejecting(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="accent"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => moderateArchiveContributionAction(contributionId, true, null))
        }
      >
        Aprovar
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => setRejecting(true)}
      >
        Rejeitar
      </Button>
    </div>
  );
}
