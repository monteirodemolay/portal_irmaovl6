'use client';

import {
  Button,
  CalendarPlus,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@vl6/ui';

/**
 * "Adicionar à minha agenda" — só um link pré-preenchido do Google Agenda e
 * o download de um `.ics` estático (RFC 5545). Nunca acessa a agenda
 * pessoal do Irmão (sem OAuth/API de calendário de terceiros) — quem
 * confirma a criação do evento é o próprio app de calendário do usuário.
 */
export function AddToCalendarMenu({
  eventId,
  titulo,
  googleCalendarUrl,
}: {
  eventId: string;
  titulo: string;
  googleCalendarUrl: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="accent" size="sm">
          <CalendarPlus size={16} strokeWidth={1.75} />
          Adicionar à minha agenda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à minha agenda</DialogTitle>
          <DialogDescription>
            Escolha como adicionar &ldquo;{titulo}&rdquo; ao seu calendário pessoal.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="justify-start">
            <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
              Google Agenda
            </a>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <a href={`/api/agenda/${eventId}/ics`} download>
              Baixar .ics (Outlook, Apple Calendar…)
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
