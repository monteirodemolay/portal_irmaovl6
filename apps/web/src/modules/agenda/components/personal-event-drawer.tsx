'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import type { PersonalEvent } from '@vl6/domain';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Input,
  Select,
  Textarea,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createPersonalEventAction,
  deletePersonalEventAction,
  updatePersonalEventAction,
  type PersonalEventActionState,
} from '../actions/personal-event-actions';

const EMPTY_STATE: PersonalEventActionState = { error: null };

const REMINDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Sem lembrete' },
  { value: '15', label: '15 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '1440', label: '1 dia antes' },
];

function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export interface PersonalEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = modo edição; ausente = criação. */
  event?: PersonalEvent | null;
  /** Pré-preenche o início (ex.: clique num dia do calendário) no modo criação. */
  defaultStart?: Date | null;
  /** Só existe efeito real com `GoogleCalendarConnection` ativa (Estágio Google). */
  canSyncGoogle?: boolean;
}

export function PersonalEventDrawer({
  open,
  onOpenChange,
  event,
  defaultStart,
  canSyncGoogle = false,
}: PersonalEventDrawerProps) {
  const action = event ? updatePersonalEventAction.bind(null, event.id) : createPersonalEventAction;
  const [state, formAction] = useActionState<PersonalEventActionState, FormData>(
    action,
    EMPTY_STATE,
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const previousStateRef = useRef(state);

  // Só reage a uma submissão real do form action (nova referência de `state`
  // vinda do servidor) — fecha o drawer quando ela chega sem erro. Depende
  // apenas de `state` de propósito, não de `onOpenChange`.
  useEffect(() => {
    if (state !== previousStateRef.current && !state.error) {
      onOpenChange(false);
    }
    previousStateRef.current = state;
  }, [state]);

  function handleDelete() {
    if (!event) return;
    if (!window.confirm('Excluir este compromisso pessoal?')) return;
    startDeleteTransition(async () => {
      await deletePersonalEventAction(event.id);
      onOpenChange(false);
    });
  }

  const start = event?.dataInicio ?? defaultStart ?? null;
  const end = event?.dataFim ?? null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <DrawerTitle>{event ? 'Editar compromisso' : 'Novo compromisso'}</DrawerTitle>
          <DrawerDescription>
            Visível só para você — nunca aparece para administradores ou outros Irmãos.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <form action={formAction} className="flex flex-col gap-4">
            <FormField label="Título" htmlFor="pe-titulo">
              <Input id="pe-titulo" name="titulo" required defaultValue={event?.titulo} />
            </FormField>
            <FormField label="Início" htmlFor="pe-dataInicio">
              <Input
                id="pe-dataInicio"
                name="dataInicio"
                type="datetime-local"
                required
                defaultValue={start ? toDatetimeLocalValue(start) : undefined}
              />
            </FormField>
            <FormField label="Fim" htmlFor="pe-dataFim">
              <Input
                id="pe-dataFim"
                name="dataFim"
                type="datetime-local"
                required
                defaultValue={end ? toDatetimeLocalValue(end) : undefined}
              />
            </FormField>
            <FormField label="Local (opcional)" htmlFor="pe-local">
              <Input id="pe-local" name="local" defaultValue={event?.local ?? ''} />
            </FormField>
            <FormField label="Descrição (opcional)" htmlFor="pe-descricao">
              <Textarea
                id="pe-descricao"
                name="descricao"
                rows={3}
                defaultValue={event?.descricao ?? ''}
              />
            </FormField>
            <FormField label="Lembrete" htmlFor="pe-lembrete">
              <Select
                id="pe-lembrete"
                name="lembreteMinutosAntes"
                defaultValue={event?.lembreteMinutosAntes?.toString() ?? ''}
              >
                {REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <label
              className="flex items-center gap-2 text-sm"
              title={canSyncGoogle ? undefined : 'Conecte sua conta Google primeiro'}
            >
              <input
                type="checkbox"
                name="sincronizarComGoogle"
                className="h-4 w-4"
                disabled={!canSyncGoogle}
                defaultChecked={event?.sincronizarComGoogle}
              />
              Sincronizar com o Google Agenda
            </label>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <div className="mt-2 flex items-center justify-between gap-2">
              {event ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700"
                >
                  {isDeleting ? 'Excluindo…' : 'Excluir'}
                </Button>
              ) : (
                <span />
              )}
              <SubmitButton isEditing={Boolean(event)} />
            </div>
          </form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar compromisso'}
    </Button>
  );
}
