'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { useAgendaOptional } from './agenda-provider';

/** Atalho lateral pra abrir o drawer institucional da Agenda — não duplica nada dele, só é outra porta de entrada. */
export function StoreAgendaQuickCard() {
  const agenda = useAgendaOptional();
  if (!agenda) return null;

  const nextEvent = agenda.events[0] ?? null;

  return (
    <Card>
      <CardHeader className="space-y-0">
        <CardTitle className="text-base">Agenda da Loja</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted text-sm">
          {nextEvent
            ? `Próximo: ${nextEvent.titulo}`
            : 'Sessões e eventos oficiais, com anexos e confirmação de presença.'}
        </p>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => agenda.openAgenda()}>
          Abrir agenda completa
        </Button>
      </CardContent>
    </Card>
  );
}
