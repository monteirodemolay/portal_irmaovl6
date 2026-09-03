'use client';

import { useTransition } from 'react';
import type { AttendanceResponse } from '@vl6/domain';
import { Button, cn } from '@vl6/ui';
import { confirmAttendanceAction } from '../actions/agenda-actions';

export function AttendanceButtons({
  eventId,
  currentStatus,
  onDark = false,
}: {
  eventId: string;
  currentStatus: 'confirmado' | 'recusado' | 'pendente' | null;
  /** Card com fundo escuro (ex.: `NextEventCard`) — troca a borda/texto do estado não-selecionado pra manter contraste. */
  onDark?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function respond(resposta: AttendanceResponse) {
    startTransition(() => confirmAttendanceAction(eventId, resposta));
  }

  const outlineClassName = onDark ? 'border-white/30 text-white hover:bg-white/10' : undefined;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={
          currentStatus === 'confirmado' || currentStatus === 'pendente' ? 'accent' : 'outline'
        }
        size="sm"
        disabled={isPending}
        onClick={() => respond('confirmado')}
        className={cn(
          currentStatus !== 'confirmado' && currentStatus !== 'pendente' && outlineClassName,
        )}
      >
        {currentStatus === 'pendente' ? 'Na lista de espera' : 'Confirmar presença'}
      </Button>
      <Button
        variant={currentStatus === 'recusado' ? 'accent' : 'outline'}
        size="sm"
        disabled={isPending}
        onClick={() => respond('recusado')}
        className={cn(currentStatus !== 'recusado' && outlineClassName)}
      >
        Não poderei ir
      </Button>
    </div>
  );
}
