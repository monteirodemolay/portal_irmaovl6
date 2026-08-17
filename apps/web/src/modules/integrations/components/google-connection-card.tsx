'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import type { GoogleCalendarConnection } from '@vl6/domain';
import {
  AlertTriangle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  RefreshCw,
  Switch,
} from '@vl6/ui';
import {
  disconnectGoogleCalendarAction,
  syncGoogleCalendarNowAction,
  updateGoogleCalendarPreferencesAction,
  type GoogleCalendarActionState,
} from '../actions/google-calendar-actions';

const EMPTY_STATE: GoogleCalendarActionState = { error: null };

function formatLastSync(date: Date | null): string {
  if (!date) return 'Nunca sincronizado';
  return `Última atualização em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)}`;
}

export function GoogleConnectionCard({
  connection,
}: {
  connection: GoogleCalendarConnection | null;
}) {
  const [connecting, setConnecting] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  if (!connection) {
    return (
      <div className="border-border flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="border-border flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-black text-[#4285f4]">
            G
          </div>
          <div>
            <p className="text-sm font-semibold">Google Agenda não conectado</p>
            <p className="text-muted text-xs">
              Conecte para ver seus compromissos Google aqui e sincronizar a Agenda da Loja.
            </p>
          </div>
        </div>
        <a
          href="/api/integrations/google-calendar/start"
          onClick={() => setConnecting(true)}
          className="bg-primary hover:bg-primary-dark flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white transition-colors"
        >
          {connecting ? 'Conectando…' : 'Conectar'}
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="border-border flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="border-border flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-black text-[#4285f4]">
            G
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Google Agenda</p>
              <StatusBadge connection={connection} />
            </div>
            <p className="text-muted text-xs">
              {connection.googleAccountEmail ?? 'Conta conectada'} ·{' '}
              {formatLastSync(connection.lastSyncedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncNowButton />
          <Button variant="outline" size="sm" onClick={() => setPreferencesOpen(true)}>
            Gerenciar sincronização
          </Button>
        </div>
      </div>

      <PreferencesDialog
        connection={connection}
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  );
}

function StatusBadge({ connection }: { connection: GoogleCalendarConnection }) {
  if (connection.syncStatus === 'syncing') {
    return <Badge variant="accent">Sincronizando…</Badge>;
  }
  if (connection.syncStatus === 'error') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle size={11} />
        Erro de sincronização
      </Badge>
    );
  }
  return <Badge variant="success">Conectado</Badge>;
}

function SyncNowButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await syncGoogleCalendarNowAction();
        })
      }
    >
      <RefreshCw size={13} className={isPending ? 'animate-spin' : undefined} />
      Sincronizar agora
    </Button>
  );
}

function PreferencesDialog({
  connection,
  open,
  onOpenChange,
}: {
  connection: GoogleCalendarConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction] = useActionState<GoogleCalendarActionState, FormData>(
    updateGoogleCalendarPreferencesAction,
    EMPTY_STATE,
  );
  const [isDisconnecting, startDisconnectTransition] = useTransition();

  function handleDisconnect() {
    if (
      !window.confirm(
        'Desconectar sua conta Google? Os eventos importados deixarão de aparecer na Minha Agenda.',
      )
    ) {
      return;
    }
    startDisconnectTransition(async () => {
      await disconnectGoogleCalendarAction();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Agenda</DialogTitle>
          <DialogDescription>
            Escolha como sua agenda pessoal e a Agenda da Loja devem funcionar juntas.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <PreferenceRow
            name="exibirEventosGoogle"
            label="Exibir meus eventos Google na Minha Agenda"
            description="Seus compromissos Google aparecerão apenas para você."
            defaultChecked={connection.preferences.exibirEventosGoogle}
          />
          <PreferenceRow
            name="sincronizarVL6ParaGoogle"
            label="Agenda da Loja → Google Agenda"
            description="Sessões e eventos VL6 passam a aparecer no seu Google Agenda."
            defaultChecked={connection.preferences.sincronizarVL6ParaGoogle}
          />
          <PreferenceRow
            name="sincronizarPessoalParaGoogle"
            label="Compromissos pessoais do Portal → Google"
            description="Compromissos privados marcados para sincronizar também vão para o Google."
            defaultChecked={connection.preferences.sincronizarPessoalParaGoogle}
          />
          <PreferenceRow
            name="detectarConflitos"
            label="Identificar conflitos de horário"
            description="A Minha Agenda avisa quando dois compromissos se sobrepõem."
            defaultChecked={connection.preferences.detectarConflitos}
          />

          <label className="border-border flex flex-col gap-1.5 border-t pt-4 text-sm">
            <span className="font-medium">Calendário da Loja no Google</span>
            <Input name="calendarId" defaultValue={connection.calendarId} />
            <span className="text-muted text-xs">
              ID do calendário Google de destino (use "primary" para o calendário principal).
            </span>
          </label>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <DialogFooter className="justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-red-600 hover:text-red-700"
            >
              {isDisconnecting ? 'Desconectando…' : 'Desconectar Google'}
            </Button>
            <SaveButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreferenceRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted text-xs">{description}</p>
      </div>
      <Switch name={name} defaultChecked={defaultChecked} />
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar configurações'}
    </Button>
  );
}
