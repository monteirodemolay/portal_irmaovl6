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

/** Logo oficial do Google (quatro cores), sem depender de fonte/ícone externo. */
function GoogleLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
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
      <div className="border-border rounded-xl border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="border-border flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white">
            <GoogleLogo />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Google Agenda não conectado</p>
            <p className="text-muted text-xs">
              Conecte para ver seus compromissos Google aqui e sincronizar a Agenda da Loja.
            </p>
          </div>
        </div>
        <a
          href="/api/integrations/google-calendar/start"
          onClick={() => setConnecting(true)}
          className="bg-primary hover:bg-primary-dark mt-3 flex h-9 w-fit items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white transition-colors"
        >
          {connecting ? 'Conectando…' : 'Conectar'}
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="border-border rounded-xl border bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="border-border flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white">
            <GoogleLogo />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Google Agenda</p>
              <StatusBadge connection={connection} />
            </div>
            <p className="text-muted truncate text-xs">
              {connection.googleAccountEmail ?? 'Conta conectada'}
            </p>
          </div>
        </div>
        <p className="text-muted mt-2 text-xs">{formatLastSync(connection.lastSyncedAt)}</p>
        {connection.syncStatus === 'error' && connection.lastError && (
          <p className="mt-2 text-xs text-red-600">{connection.lastError}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
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
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="accent"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await syncGoogleCalendarNowAction();
            if (!result.ok) setError(result.error);
          })
        }
      >
        <RefreshCw size={13} className={isPending ? 'animate-spin' : undefined} />
        {isPending ? 'Sincronizando…' : 'Sincronizar agora'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
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
