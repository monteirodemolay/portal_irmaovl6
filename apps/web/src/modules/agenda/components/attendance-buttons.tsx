'use client';

import { useTransition } from 'react';
import type { AttendanceResponse } from '@vl6/domain';
import { Button } from '@vl6/ui';
import { confirmAttendanceAction } from '../actions/agenda-actions';

export function AttendanceButtons({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: 'confirmado' | 'recusado' | 'pendente' | null;
}) {
  const [isPending, startTransition] = useTransition();

  function respond(resposta: AttendanceResponse) {
    startTransition(() => confirmAttendanceAction(eventId, resposta));
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={
          currentStatus === 'confirmado' || currentStatus === 'pendente' ? 'accent' : 'outline'
        }
        size="sm"
        disabled={isPending}
        onClick={() => respond('confirmado')}
      >
        {currentStatus === 'pendente' ? 'Na lista de espera' : 'Confirmar presença'}
      </Button>
      <Button
        variant={currentStatus === 'recusado' ? 'accent' : 'outline'}
        size="sm"
        disabled={isPending}
        onClick={() => respond('recusado')}
      >
        Não poderei ir
      </Button>
    </div>
  );
}
